import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { users, incidents, neighborhoods, type User, type InsertUser, type Incident, type InsertIncident, type Neighborhood, type InsertNeighborhood } from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function log(...args: any[]) {
  // eslint-disable-next-line no-console
  console.log('[storage]', ...args);
}

function tryLoadJson(possiblePaths: string[], label: string) {
  for (const p of possiblePaths) {
    log(`Trying to load ${label} from: ${p}`);
    if (fs.existsSync(p)) {
      log(`Found ${label} at: ${p}`);
      try {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      } catch (err) {
        log(`Error reading ${label} at ${p}:`, err);
      }
    } else {
      log(`File does not exist: ${p}`);
    }
  }
  log(`Could not find ${label} in any known location. Using fallback data.`);
  return null;
}

function loadMockData() {
  const cwd = process.cwd();
  log('process.cwd():', cwd);
  log('__dirname:', __dirname);

  // Possible locations for mock data
  const possibleDirs = [
    path.resolve(__dirname, '../mock-data'),
    path.resolve(__dirname, '../../mock-data'),
    path.resolve(cwd, 'dist/mock-data'),
    path.resolve(cwd, 'mock-data'),
    path.resolve(cwd, '../mock-data'),
  ];
  const neighborhoodsPaths = possibleDirs.map(dir => path.join(dir, 'neighborhoods.json'));
  const incidentsPaths = possibleDirs.map(dir => path.join(dir, 'incidents.json'));

  const neighborhoodsData = tryLoadJson(neighborhoodsPaths, 'neighborhoods.json') || [
    { name: 'Tenderloin', count: 20 },
    { name: 'SOMA', count: 9 },
    { name: 'Mission', count: 7 },
    { name: 'Castro', count: 5 },
    { name: 'Financial District', count: 3 },
    { name: 'Union Square', count: 4 },
    { name: 'Nob Hill', count: 2 },
  ];
  const incidentsData = tryLoadJson(incidentsPaths, 'incidents.json') || [
    {
      type: 'human',
      latitude: '37.7850',
      longitude: '-122.4120',
      location: 'Geary St & Leavenworth St',
      neighborhood: 'Tenderloin',
      reporter: 'Anonymous',
      status: 'pending',
      minutesAgo: 2,
      isRecent: true,
    },
    {
      type: 'human',
      latitude: '37.7845',
      longitude: '-122.4110',
      location: 'Eddy St & Hyde St',
      neighborhood: 'Tenderloin',
      reporter: 'Anonymous',
      status: 'pending',
      minutesAgo: 5,
      isRecent: true,
    },
  ];

  log(`Loaded neighborhoods: ${Array.isArray(neighborhoodsData) ? neighborhoodsData.length : 0}`);
  log(`Loaded incidents: ${Array.isArray(incidentsData) ? incidentsData.length : 0}`);

  return { neighborhoodsData, incidentsData };
}

const { neighborhoodsData, incidentsData } = loadMockData();

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Incident operations
  getAllIncidents(): Promise<Incident[]>;
  getIncidentById(id: number): Promise<Incident | undefined>;
  createIncident(incident: InsertIncident): Promise<Incident>;
  getIncidentsByNeighborhood(neighborhood: string): Promise<Incident[]>;
  getRecentIncidents(): Promise<Incident[]>;
  getTodaysIncidents(): Promise<Incident[]>;
  
  // Neighborhood operations
  getAllNeighborhoods(): Promise<Neighborhood[]>;
  getNeighborhoodByName(name: string): Promise<Neighborhood | undefined>;
  updateNeighborhoodCount(name: string, count: number): Promise<void>;
  
  // Stats operations
  getTodaysStats(): Promise<{
    reportsToday: number;
    tenderLoin: number;
    nearUser: number;
    lastHour: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private incidents: Map<number, Incident>;
  private neighborhoods: Map<string, Neighborhood>;
  private currentUserId: number;
  private currentIncidentId: number;
  private currentNeighborhoodId: number;

  constructor() {
    this.users = new Map();
    this.incidents = new Map();
    this.neighborhoods = new Map();
    this.currentUserId = 1;
    this.currentIncidentId = 1;
    this.currentNeighborhoodId = 1;
    
    // Initialize with SF neighborhoods
    this.initializeNeighborhoods();
    this.initializeIncidents();
  }

  private initializeNeighborhoods() {
    neighborhoodsData.forEach((neighborhood: any) => {
      const id = this.currentNeighborhoodId++;
      this.neighborhoods.set(neighborhood.name, {
        id,
        name: neighborhood.name,
        count: neighborhood.count,
      });
    });
  }

  private initializeIncidents() {
    incidentsData.forEach((incident: any) => {
      const id = this.currentIncidentId++;
      this.incidents.set(id, {
        ...incident,
        createdAt: new Date(Date.now() - (incident.minutesAgo ?? 0) * 60000),
        id,
        imageUrl: null,
      });
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllIncidents(): Promise<Incident[]> {
    return Array.from(this.incidents.values());
  }

  async getIncidentById(id: number): Promise<Incident | undefined> {
    return this.incidents.get(id);
  }

  async createIncident(insertIncident: InsertIncident): Promise<Incident> {
    const id = this.currentIncidentId++;
    const incident: Incident = {
      id,
      type: insertIncident.type,
      latitude: insertIncident.latitude,
      longitude: insertIncident.longitude,
      location: insertIncident.location,
      neighborhood: insertIncident.neighborhood,
      reporter: insertIncident.reporter || "Anonymous",
      status: insertIncident.status || "pending",
      imageUrl: insertIncident.imageUrl || null,
      createdAt: new Date(),
      isRecent: true,
    };
    this.incidents.set(id, incident);
    
    // Update neighborhood count
    const neighborhood = this.neighborhoods.get(insertIncident.neighborhood);
    if (neighborhood) {
      neighborhood.count++;
    }
    
    return incident;
  }

  async getIncidentsByNeighborhood(neighborhood: string): Promise<Incident[]> {
    return Array.from(this.incidents.values()).filter(
      (incident) => incident.neighborhood === neighborhood,
    );
  }

  async getRecentIncidents(): Promise<Incident[]> {
    return Array.from(this.incidents.values()).filter(
      (incident) => incident.isRecent,
    );
  }

  async getTodaysIncidents(): Promise<Incident[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return Array.from(this.incidents.values()).filter(
      (incident) => incident.createdAt >= today,
    );
  }

  async getAllNeighborhoods(): Promise<Neighborhood[]> {
    return Array.from(this.neighborhoods.values());
  }

  async getNeighborhoodByName(name: string): Promise<Neighborhood | undefined> {
    return this.neighborhoods.get(name);
  }

  async updateNeighborhoodCount(name: string, count: number): Promise<void> {
    const neighborhood = this.neighborhoods.get(name);
    if (neighborhood) {
      neighborhood.count = count;
    }
  }

  async getTodaysStats(): Promise<{
    reportsToday: number;
    tenderLoin: number;
    nearUser: number;
    lastHour: number;
  }> {
    const todaysIncidents = await this.getTodaysIncidents();
    const lastHour = new Date(Date.now() - 3600000); // 1 hour ago
    
    return {
      reportsToday: todaysIncidents.length,
      tenderLoin: todaysIncidents.filter(i => i.neighborhood === "Tenderloin").length,
      nearUser: 8, // Mock value for nearby incidents
      lastHour: Array.from(this.incidents.values()).filter(
        (incident) => incident.createdAt >= lastHour,
      ).length,
    };
  }
}

export const storage = new MemStorage();

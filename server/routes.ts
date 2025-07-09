import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertIncidentSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all incidents
  app.get("/api/incidents", async (req, res) => {
    try {
      const incidents = await storage.getAllIncidents();
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

  // Get incident by ID
  app.get("/api/incidents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const incident = await storage.getIncidentById(id);
      
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }
      
      res.json(incident);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incident" });
    }
  });

  // Create new incident
  app.post("/api/incidents", async (req, res) => {
    try {
      const validation = insertIncidentSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid incident data", 
          details: validation.error.issues 
        });
      }
      
      const incident = await storage.createIncident(validation.data);
      res.status(201).json(incident);
    } catch (error) {
      res.status(500).json({ error: "Failed to create incident" });
    }
  });

  // Get incidents by neighborhood
  app.get("/api/incidents/neighborhood/:name", async (req, res) => {
    try {
      const incidents = await storage.getIncidentsByNeighborhood(req.params.name);
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch neighborhood incidents" });
    }
  });

  // Get recent incidents
  app.get("/api/incidents/recent", async (req, res) => {
    try {
      const incidents = await storage.getRecentIncidents();
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent incidents" });
    }
  });

  // Get all neighborhoods
  app.get("/api/neighborhoods", async (req, res) => {
    try {
      const neighborhoods = await storage.getAllNeighborhoods();
      res.json(neighborhoods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch neighborhoods" });
    }
  });

  // Get today's stats
  app.get("/api/stats/today", async (req, res) => {
    try {
      const stats = await storage.getTodaysStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch today's stats" });
    }
  });

  // Debug endpoint to inspect file system and environment in production
  app.get("/api/debug", async (req, res) => {
    const fs = await import('fs');
    const path = await import('path');

    const debug: any = {
      cwd: process.cwd(),
      __dirname: typeof import.meta.dirname !== 'undefined' ? import.meta.dirname : 'undefined',
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      files: [],
      mockDataPaths: []
    };

    // Try to read current directory
    try {
      debug.files = fs.readdirSync(process.cwd());
    } catch (e: any) {
      debug.files = [`Error: ${e.message}`];
    }

    // Check all possible mock data paths
    const possiblePaths = [
      path.resolve(process.cwd(), "mock-data"),
      path.resolve(process.cwd(), "dist/mock-data"),
      path.resolve(typeof import.meta.dirname !== 'undefined' ? import.meta.dirname : '.', "../mock-data"),
      "./mock-data",
      "./dist/mock-data"
    ];

    for (const mockPath of possiblePaths) {
      try {
        const exists = fs.existsSync(mockPath);
        const contents = exists ? fs.readdirSync(mockPath) : null;
        debug.mockDataPaths.push({ path: mockPath, exists, contents });
      } catch (e: any) {
        debug.mockDataPaths.push({ path: mockPath, error: e.message });
      }
    }

    res.json(debug);
  });

  const httpServer = createServer(app);
  return httpServer;
}

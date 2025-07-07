import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertIncidentSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const prefix = process.env.VERCEL ? "" : "/api";

  // Get all incidents
  app.get(`${prefix}/incidents`, async (req, res) => {
    try {
      const incidents = await storage.getAllIncidents();
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  });

  // Get incident by ID
  app.get(`${prefix}/incidents/:id`, async (req, res) => {
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
  app.post(`${prefix}/incidents`, async (req, res) => {
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
  app.get(`${prefix}/incidents/neighborhood/:name`, async (req, res) => {
    try {
      const incidents = await storage.getIncidentsByNeighborhood(req.params.name);
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch neighborhood incidents" });
    }
  });

  // Get recent incidents
  app.get(`${prefix}/incidents/recent`, async (req, res) => {
    try {
      const incidents = await storage.getRecentIncidents();
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent incidents" });
    }
  });

  // Get all neighborhoods
  app.get(`${prefix}/neighborhoods`, async (req, res) => {
    try {
      const neighborhoods = await storage.getAllNeighborhoods();
      res.json(neighborhoods);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch neighborhoods" });
    }
  });

  // Get today's stats
  app.get(`${prefix}/stats/today`, async (req, res) => {
    try {
      const stats = await storage.getTodaysStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch today's stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

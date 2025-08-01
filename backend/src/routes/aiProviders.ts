import { Router, Request, Response } from "express";
import { EncryptionService } from "../lib/encryption";

const router = Router();

// Get user's AI providers
router.get("/", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = req.session.userId;

    // Import prisma here to avoid circular dependencies
    const { PrismaClient } = require("../generated/prisma");
    const prisma = new PrismaClient();

    const providers = await prisma.aIProvider.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Don't include apiKey for security
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(providers);
  } catch (error) {
    console.error("Error fetching AI providers:", error);
    res.status(500).json({ error: "Failed to fetch AI providers" });
  }
});

// Add a new AI provider
router.post("/", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { provider, name, apiKey } = req.body;
    const userId = req.session.userId;

    if (!provider || !name || !apiKey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate provider type
    const validProviders = ["openai", "google", "claude", "perplexity"];
    if (!validProviders.includes(provider.toLowerCase())) {
      return res.status(400).json({ error: "Invalid provider type" });
    }

    // Import prisma here to avoid circular dependencies
    const { PrismaClient } = require("../generated/prisma");
    const prisma = new PrismaClient();

    // Check if provider already exists for this user
    const existingProvider = await prisma.aIProvider.findFirst({
      where: {
        userId,
        provider: provider.toLowerCase(),
      },
    });

    if (existingProvider) {
      return res
        .status(400)
        .json({ error: "Provider already exists for this user" });
    }

    // Encrypt the API key
    const encryptedApiKey = EncryptionService.encrypt(apiKey);

    // Check if this is the first provider for this user
    const existingProviders = await prisma.aIProvider.findMany({
      where: { userId },
    });

    // Create new provider - activate it if it's the first one
    const newProvider = await prisma.aIProvider.create({
      data: {
        userId,
        provider: provider.toLowerCase(),
        name,
        apiKey: encryptedApiKey,
        isActive: existingProviders.length === 0, // Activate if first provider
      },
      select: {
        id: true,
        provider: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Don't include apiKey for security
      },
    });

    res.json(newProvider);
  } catch (error) {
    console.error("Error adding AI provider:", error);
    res.status(500).json({ error: "Failed to add AI provider" });
  }
});

// Update an AI provider
router.put("/:providerId", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const providerId = req.params.providerId;
    const { name, apiKey, isActive } = req.body;
    const userId = req.session.userId;

    // Import prisma here to avoid circular dependencies
    const { PrismaClient } = require("../generated/prisma");
    const prisma = new PrismaClient();

    // Check if provider exists and belongs to user
    const existingProvider = await prisma.aIProvider.findFirst({
      where: {
        id: providerId,
        userId,
      },
    });

    if (!existingProvider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (apiKey !== undefined) {
      updateData.apiKey = EncryptionService.encrypt(apiKey);
    }

    // Handle isActive toggle - if activating this provider, deactivate others
    if (isActive !== undefined) {
      if (isActive) {
        // If activating this provider, deactivate all other providers for this user
        await prisma.aIProvider.updateMany({
          where: {
            userId,
            id: { not: providerId },
          },
          data: { isActive: false },
        });
      }
      updateData.isActive = isActive;
    }

    // Update provider
    const updatedProvider = await prisma.aIProvider.update({
      where: { id: providerId },
      data: updateData,
      select: {
        id: true,
        provider: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Don't include apiKey for security
      },
    });

    res.json(updatedProvider);
  } catch (error) {
    console.error("Error updating AI provider:", error);
    res.status(500).json({ error: "Failed to update AI provider" });
  }
});

// Delete an AI provider
router.delete("/:providerId", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const providerId = req.params.providerId;
    const userId = req.session.userId;

    // Import prisma here to avoid circular dependencies
    const { PrismaClient } = require("../generated/prisma");
    const prisma = new PrismaClient();

    // Check if provider exists and belongs to user
    const existingProvider = await prisma.aIProvider.findFirst({
      where: {
        id: providerId,
        userId,
      },
    });

    if (!existingProvider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    // Delete provider
    await prisma.aIProvider.delete({
      where: { id: providerId },
    });

    res.json({ message: "AI provider deleted successfully" });
  } catch (error) {
    console.error("Error deleting AI provider:", error);
    res.status(500).json({ error: "Failed to delete AI provider" });
  }
});

// Test an AI provider connection
router.post("/:providerId/test", async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const providerId = req.params.providerId;
    const userId = req.session.userId;

    // Import prisma here to avoid circular dependencies
    const { PrismaClient } = require("../generated/prisma");
    const prisma = new PrismaClient();

    // Get provider with encrypted API key
    const provider = await prisma.aIProvider.findFirst({
      where: {
        id: providerId,
        userId,
      },
    });

    if (!provider) {
      return res.status(404).json({ error: "Provider not found" });
    }

    // Import AI provider factory
    const { AIProviderFactory } = require("../lib/aiProviders");

    try {
      // Create provider instance and test with a simple prompt
      const aiProvider = AIProviderFactory.createProvider(
        provider.provider,
        provider.apiKey
      );

      // Test with a simple analysis
      const testCommit = {
        message: "test commit",
        author: "test author",
        date: new Date().toISOString(),
        diff: [],
      };

      const result = await aiProvider.analyzeCommit(testCommit);

      res.json({
        success: true,
        message: "Connection successful",
        testResult: result.substring(0, 100) + "...", // Truncate for security
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error:
          "Connection failed: " +
          (error instanceof Error ? error.message : "Unknown error"),
      });
    }
  } catch (error) {
    console.error("Error testing AI provider:", error);
    res.status(500).json({ error: "Failed to test AI provider" });
  }
});

export default router;

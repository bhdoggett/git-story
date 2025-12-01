"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const requireAuth = (req, res, next) => {
    // Check if user is authenticated
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    // Check if access token exists
    const accessToken = req.session?.accessToken;
    if (!accessToken) {
        return res.status(401).json({ error: "No access token found" });
    }
    // Add access token to request object for easy access in route handlers
    req.accessToken = accessToken;
    next();
};
exports.requireAuth = requireAuth;

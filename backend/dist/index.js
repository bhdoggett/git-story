"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const passport_github2_1 = require("passport-github2");
const auth_1 = __importDefault(require("./routes/auth"));
const repos_1 = __importDefault(require("./routes/repos"));
const stories_1 = __importDefault(require("./routes/stories"));
dotenv_1.default.config();
const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL || "http://localhost:5173";
const app = (0, express_1.default)();
// Trust proxy so secure cookies and protocol work correctly behind load balancers/reverse proxies
app.set("trust proxy", 1);
app.use((0, cors_1.default)({ origin: CLIENT_BASE_URL, credentials: true }));
app.use(express_1.default.json());
// --- Session middleware ---
const isProduction = process.env.NODE_ENV === "production";
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction, // true in production, false in development
        httpOnly: true,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
}));
// --- Passport setup ---
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
passport_1.default.serializeUser((user, done) => {
    done(null, user);
});
passport_1.default.deserializeUser((obj, done) => {
    done(null, obj);
});
passport_1.default.use(new passport_github2_1.Strategy({
    clientID: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    callbackURL: process.env.GITHUB_CALLBACK_URL ||
        "http://localhost:3000/auth/github/callback",
}, (accessToken, refreshToken, profile, done) => {
    // You can store/retrieve user info here
    return done(null, { profile, accessToken });
}));
// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
    });
});
app.use("/auth", auth_1.default);
app.use("/api/repos", repos_1.default);
app.use("/api/stories", stories_1.default);
const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
});

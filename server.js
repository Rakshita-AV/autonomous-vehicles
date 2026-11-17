const express = require('express');
const path = require('path');
const fs = require('fs'); // The File System tool package
const cookieParser = require('cookie-parser'); // For tracking authenticated sessions safely

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser()); // Enables reading tracking tokens from client requests
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'vehicles.json');
const HAZARDS_FILE = path.join(__dirname, 'hazards.json');
const USERS_FILE = path.join(__dirname, 'users.json');

// Hardcoded credential parameters for default profiles
const MOCK_ADMIN = { username: "admin", password: "admin123" };
const MOCK_SYSTEM_OPERATOR = { username: "system operator", password: "operator123" };

// Regional graph representation matching South India deployment corridors
const corridorGraph = {
    "Chennai": { "Pondicherry": { distance: 150, mainRoad: "ECR Highway", altRoad: "Tindivanam Bypass Corridor" } },
    "Coimbatore": { "Tirupur": { distance: 50, mainRoad: "Avinashi Road", altRoad: "Palladam Highway Track" } },
    "Madurai": { "Rameswaram": { distance: 170, mainRoad: "NH 87 Corridor", altRoad: "Sivagangai Bypass Track" } },
    "Trichy": { "Thanjavur": { distance: 60, mainRoad: "NH 83 Highway", altRoad: "Sengipatti Industrial Loop" } },
    "Bengaluru": { "Mysuru": { distance: 140, mainRoad: "Mysore Expressway", altRoad: "Kanakapura Road Grid" } },
    "Kochi": { "Thrissur": { distance: 85, mainRoad: "NH 66 Route", altRoad: "Chalakkudy Inland Route" } },
    "Salem": { "Namakkal": { distance: 55, mainRoad: "NH 44 Highway", altRoad: "Rasipuram Connecting Link" } },
    "Kozhikode": { "Malappuram": { distance: 50, mainRoad: "NH 66 Coastal Track", altRoad: "Kondotty Internal Bypass" } }
};

// Helper Function: Ensure necessary JSON storage files exist on startup
function ensureDataFilesExist() {
    [DATA_FILE, HAZARDS_FILE, USERS_FILE].forEach(file => {
        if (!fs.existsSync(file)) {
            let defaultData = [];
            if (file === DATA_FILE) {
                // Updated with 8 entirely distinct, non-overlapping regional paths across South India
                defaultData = [
                    { id: "AV-101", model: "Tesla CyberCab", routeKey: "Route1", status: "Autonomous Driving", speed: "45 km/h", battery: "82%", currentPath: "ECR Highway", latitude: 12.5244, longitude: 80.2194 },
                    { id: "AV-102", model: "Waymo Jaguar", routeKey: "Route2", status: "Autonomous Driving", speed: "45 km/h", battery: "100%", currentPath: "Avinashi Road", latitude: 11.0168, longitude: 76.9558 },
                    { id: "AV-103", model: "Cruise Origin", routeKey: "Route3", status: "Charging", speed: "0 km/h", battery: "14%", currentPath: "Transit Paused", latitude: 9.6844, longitude: 78.8322 },
                    { id: "AV-104", model: "Audi e-tron", routeKey: "Route4", status: "Autonomous Driving", speed: "45 km/h", battery: "78%", currentPath: "NH 83 Highway", latitude: 10.7905, longitude: 78.9814 },
                    { id: "AV-105", model: "Porsche Taycan", routeKey: "Route5", status: "Autonomous Driving", speed: "45 km/h", battery: "92%", currentPath: "Mysore Expressway", latitude: 12.5000, longitude: 77.2000 },
                    { id: "AV-106", model: "Mercedes Benz", routeKey: "Route6", status: "Autonomous Driving", speed: "45 km/h", battery: "67%", currentPath: "NH 66 Route", latitude: 10.2000, longitude: 76.3500 },
                    { id: "AV-107", model: "BMW i7", routeKey: "Route7", status: "Autonomous Driving", speed: "45 km/h", battery: "62%", currentPath: "NH 44 Highway", latitude: 11.4500, longitude: 78.1600 },
                    { id: "AV-108", model: "Swift", routeKey: "Route8", status: "Autonomous Driving", speed: "45 km/h", battery: "87%", currentPath: "NH 66 Coastal Track", latitude: 11.1500, longitude: 75.8500 }
                ];
            } else if (file === HAZARDS_FILE) {
                // Synchronized with frontend drop-down options matching regional corridor sectors
                defaultData = [
                    { hazardId: "HZ-901", type: "Heavy Construction Zone", zone: "ECR Highway (Route1)", severity: "Medium" },
                    { hazardId: "HZ-902", type: "Pothole / Road Damage Accident", zone: "Avinashi Road (Route2)", severity: "High" },
                    { hazardId: "HZ-903", type: "Water Logging / Flooding", zone: "NH 87 Corridor (Route3)", severity: "High" },
                    { hazardId: "HZ-904", type: "Heavy City Traffic Congestion", zone: "NH 83 Highway (Route4)", severity: "Medium" },
                    { hazardId: "HZ-905", type: "Heavy Construction Zone", zone: "Mysore Expressway (Route5)", severity: "Medium" },
                    { hazardId: "HZ-906", type: "Water Logging / Flooding", zone: "NH 66 Route (Route6)", severity: "High" },
                    { hazardId: "HZ-907", type: "Pothole / Road Damage Accident", zone: "NH 44 Highway (Route7)", severity: "High" },
                    { hazardId: "HZ-908", type: "Heavy City Traffic Congestion", zone: "NH 66 Coastal Track (Route8)", severity: "Medium" }
                ];
            } else if (file === USERS_FILE) {
                // Generates an empty array shell baseline instead of leaving undefined to prevent fatal parser exceptions
                defaultData = [];
            }
            fs.writeFileSync(file, JSON.stringify(defaultData, null, 2), 'utf8');
        }
    });
}
ensureDataFilesExist();

// Helper Function: Read users from JSON database
function readUsersFromFile() {
    try {
        const fileData = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(fileData);
    } catch (error) {
        console.error("Error reading users file, returning empty array.");
        return [];
    }
}

// Helper Function: Save users to JSON database
function writeUsersToFile(usersArray) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2), 'utf8');
    } catch (error) {
        console.error("Critical error saving users list to disk.");
    }
}

// Helper Function: Safely pull current array values out of the JSON file
function readVehiclesFromFile() {
    try {
        const fileData = fs.readFileSync(DATA_FILE, 'utf8');
        let parsed = JSON.parse(fileData);
        
        let modified = false;
        const keys = ["Route1", "Route2", "Route3", "Route4", "Route5", "Route6", "Route7", "Route8"];
        const routeConfigDefaults = {
            Route1: "ECR Highway",
            Route2: "Avinashi Road",
            Route3: "NH 87 Corridor",
            Route4: "NH 83 Highway",
            Route5: "Mysore Expressway",
            Route6: "NH 66 Route",
            Route7: "NH 44 Highway",
            Route8: "NH 66 Coastal Track"
        };
        
        parsed.forEach((v, index) => {
            if (!v.routeKey) {
                v.routeKey = keys[index % 8];
                modified = true;
            }
            if (!v.currentPath) {
                v.currentPath = routeConfigDefaults[v.routeKey];
                modified = true;
            }
            if (v.status === "Parked/Charging") {
                v.status = "Charging";
                modified = true;
            }
        });
        
        if (modified) {
            fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf8');
        }
        
        return parsed;
    } catch (error) {
        console.error("Error reading data file, returning empty fallback array.");
        return [];
    }
}

// Helper Function: Write any status shifts or newly injected entries to the storage
function writeVehiclesToFile(dataArray) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(dataArray, null, 2), 'utf8');
    } catch (error) {
        console.error("Critical hard drive file write transaction failure.");
    }
}

// Helper Function: Safely pull current environmental incidents records
function readHazardsFromFile() {
    try {
        const fileData = fs.readFileSync(HAZARDS_FILE, 'utf8');
        return JSON.parse(fileData);
    } catch (error) {
        console.error("Error reading hazards tracker data file.");
        return [];
    }
}

// Helper Function: Persist updated incident conditions mapping logs
function writeHazardsToFile(hazardsArray) {
    try {
        fs.writeFileSync(HAZARDS_FILE, JSON.stringify(hazardsArray, null, 2), 'utf8');
    } catch (error) {
        console.error("Failed to commit tracking database modifications for hazard streams.");
    }
}

// ==========================================
// AUTHENTICATION MIDDLEWARE & ENDPOINTS
// ==========================================

function requireAuth(req, res, next) {
    if (req.cookies.session_token === 'secure_telemetry_token_abc123') {
        return next();
    }
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: "Unauthorized access detected." });
    }
    res.redirect('/dashboard.html');
}

app.get('/api/usernames', (req, res) => {
    const defaultUsernames = [
        MOCK_ADMIN.username,
        MOCK_SYSTEM_OPERATOR.username
    ];
    res.json(defaultUsernames);
});

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).send("Username and password are required.");
    }

    const trimmedUser = username.trim();
    const lowerUser = trimmedUser.toLowerCase();

    if (lowerUser === MOCK_ADMIN.username.toLowerCase() || lowerUser === MOCK_SYSTEM_OPERATOR.username.toLowerCase()) {
        return res.status(400).send("Username is reserved for administrative system profiles.");
    }

    const registeredUsers = readUsersFromFile();
    const userExists = registeredUsers.some(u => u.username.toLowerCase() === lowerUser);

    if (userExists) {
        return res.status(400).send("User already registered. Please proceed to login.");
    }

    registeredUsers.push({ username: trimmedUser, password: password });
    writeUsersToFile(registeredUsers);

    res.status(201).send("Registration successful!");
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const trimmedUser = (username || "").trim().toLowerCase();

    if (trimmedUser === MOCK_ADMIN.username.toLowerCase() && password === MOCK_ADMIN.password) {
        res.cookie('session_token', 'secure_telemetry_token_abc123', { maxAge: 3600000, httpOnly: true });
        return res.sendStatus(200);
    }

    if (trimmedUser === MOCK_SYSTEM_OPERATOR.username.toLowerCase() && password === MOCK_SYSTEM_OPERATOR.password) {
        res.cookie('session_token', 'secure_telemetry_token_abc123', { maxAge: 3600000, httpOnly: true });
        return res.sendStatus(200);
    }

    const registeredUsers = readUsersFromFile();
    const validatedUser = registeredUsers.find(
        u => u.username.toLowerCase() === trimmedUser && u.password === password
    );

    if (validatedUser) {
        res.cookie('session_token', 'secure_telemetry_token_abc123', { maxAge: 3600000, httpOnly: true });
        return res.sendStatus(200);
    }

    res.status(401).send("Invalid credentials.");
});

app.get('/', (req, res) => {
    res.redirect('/dashboard.html');
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ==========================================
// SECURED AV DATA TELEMETRY ENDPOINTS
// ==========================================

app.get('/api/vehicles', requireAuth, (req, res) => {
    const currentVehicles = readVehiclesFromFile();
    res.json(currentVehicles);
});

app.post('/api/vehicles/sync', requireAuth, (req, res) => {
    const fleetUpdate = req.body;
    if (Array.isArray(fleetUpdate)) {
        writeVehiclesToFile(fleetUpdate);
        return res.sendStatus(200);
    }
    res.status(400).send("Invalid structure payload.");
});

// ==========================================
// HAZARDS MANAGEMENT ENDPOINTS 
// ==========================================

app.get('/api/hazards', requireAuth, (req, res) => {
    const currentHazards = readHazardsFromFile();
    res.json(currentHazards);
});

app.post('/api/hazards/sync', requireAuth, (req, res) => {
    const hazardsUpdate = req.body;
    if (Array.isArray(hazardsUpdate)) {
        writeHazardsToFile(hazardsUpdate);
        return res.sendStatus(200);
    }
    res.status(400).send("Invalid structure payload for hazards repository update.");
});

// ==========================================
// DYNAMIC GRAPH CORRIDOR PATH ROUTER
// ==========================================

app.post('/api/calculate-route', requireAuth, (req, res) => {
    const { source, destination, activeHazards } = req.body;
    
    if (!source || !destination) {
        return res.status(400).json({ error: "Missing source or destination coordinates." });
    }

    const node = corridorGraph[source];
    if (!node || !node[destination]) {
        return res.status(404).json({ error: "Specified corridor path vector not found." });
    }

    const pathData = node[destination];
    let selectedRoute = pathData.mainRoad;

    // Evaluate hazard indicators to dynamic bypass configurations
    if (activeHazards && activeHazards.length > 0) {
        const matchesHazard = activeHazards.some(h => h.from === source && h.to === destination);
        if (matchesHazard) {
            selectedRoute = pathData.altRoad;
        }
    }

    res.json({
        corridor: `${source} to ${destination}`,
        baselineRoad: pathData.mainRoad,
        assignedBypass: pathData.altRoad,
        routePlan: [source, selectedRoute, destination],
        distanceMetrics: `${pathData.distance} km`
    });
});

app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(` Autonomous Vehicle API is live at http://localhost:${PORT}`);
    console.log(` SECURITY ENGINE: Protected paths initialized with Cookie Session control.`);
    console.log(` DATA PERSISTENCE RUNNING: Writing modifications directly to vehicles.json!`);
    console.log(` ROUTING INFRASTRUCTURE: Graph corridor edge matrix operations online.`);
    console.log(`======================================================\n`);
});

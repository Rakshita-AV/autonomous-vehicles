const express = require('express');
const path = require('path');
const fs = require('fs'); // The File System tool package
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'vehicles.json');
const HAZARDS_FILE = path.join(__dirname, 'hazards.json');

// Helper Function: Safely pull current array values out of the JSON file
function readVehiclesFromFile() {
    try {
        const fileData = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(fileData);
    } catch (error) {
        console.error("Error reading data file, returning empty fallback array.");
        return [];
    }
}

// Helper Function: Write any status shifts or newly injected entries to the hard drive storage
function writeVehiclesToFile(dataArray) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(dataArray, null, 2), 'utf8');
    } catch (error) {
        console.error("Critical hard drive file write transaction failure.");
    }
}

// 1. Fetch Fleet Endpoint
app.get('/api/vehicles', (req, res) => {
    const currentVehicles = readVehiclesFromFile();
    res.json(currentVehicles);
});

// 2. Emergency Stop Endpoint
app.get('/api/vehicles/:id/emergency-stop', (req, res) => {
    const carId = req.params.id;
    const currentVehicles = readVehiclesFromFile();
    const vehicle = currentVehicles.find(v => v.id === carId);
    
    if (vehicle) {
        vehicle.status = "Emergency Stopped";
        vehicle.speed = "0 km/h";
        
        writeVehiclesToFile(currentVehicles); // Save state permanently!
        res.send(`EMERGENCY BRAKE ENGAGED SATELLITE SIGNAL TRANSMITTED TO UNIT ${carId}.`);
    } else {
        res.status(404).send("Vehicle footprint signature not found.");
    }
});

// 3. Register New Unit Endpoint
app.post('/api/vehicles', (req, res) => {
    const { id, model, battery } = req.body;
    const currentVehicles = readVehiclesFromFile();

    const newVehicle = {
        id: id || `AV-${Math.floor(100 + Math.random() * 900)}`,
        model: model || "Generic Fleet Prototype",
        status: "Autonomous Driving",
        speed: "45 km/h",
        battery: battery || "90%"
    };

    currentVehicles.push(newVehicle);
    writeVehiclesToFile(currentVehicles); // Save new addition onto hard disk!
    
    res.status(201).json(newVehicle);
});

// 4. Deregister Unit Endpoint
app.delete('/api/vehicles/:id', (req, res) => {
    const carId = req.params.id;
    let currentVehicles = readVehiclesFromFile();
    const initialLength = currentVehicles.length;
    
    currentVehicles = currentVehicles.filter(v => v.id !== carId);
    
    if (currentVehicles.length < initialLength) {
        writeVehiclesToFile(currentVehicles); // Save structural changes safely!
        res.send(`Unit reference ${carId} dropped from tracking core.`);
    } else {
        res.status(404).send("Deregistration target mismatch.");
    }
});

// 5. Intelligent Route Validation Endpoint (WITH AUTOMATIC EMERGENCY RESET)
app.post('/api/vehicles/:id/scan-route', (req, res) => {
    const carId = req.params.id;
    const { targetZone } = req.body;
    
    const currentVehicles = readVehiclesFromFile();
    const vehicle = currentVehicles.find(v => v.id === carId);
    
    if (!vehicle) {
        return res.status(404).json({ hazardDetected: false, message: "Target unit missing." });
    }

    // Read the hazard configurations
    fs.readFile(HAZARDS_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: "Could not read hazard register map." });
        
        const routeHazards = JSON.parse(data);
        
        // Safe check matching for strings
        const foundHazard = routeHazards.find(h => 
            h.zone && targetZone && h.zone.trim().toLowerCase() === targetZone.trim().toLowerCase()
        );

        if (foundHazard) {
            // Hazard detected! Update metrics accordingly
            vehicle.status = `Detouring: Avoided ${foundHazard.type}`;
            vehicle.speed = "15 km/h";
            
            writeVehiclesToFile(currentVehicles); // Write immediately to vehicles.json
            
            res.json({
                hazardDetected: true,
                message: `CRITICAL ALERT: ${foundHazard.type} confirmed at ${foundHazard.zone}!`,
                actionPlan: "Rerouting vehicle onto safe parallel path automatically."
            });
        } 
        else {
    // Check if the user routed the car to the charging base station
    if (targetZone === "Safe Zone Blue") {
        vehicle.status = "Parked/Charging";
        vehicle.speed = "0 km/h";
        
        writeVehiclesToFile(currentVehicles);
        
        res.json({
            hazardDetected: false,
            message: `Unit ${carId} has arrived at Terminal Base. Commencing battery recharge sequence.`,
            actionPlan: "Powering down drive motors. Grid connection established."
        });
    }

        else {
            // No hazards found! This explicitly clears "Emergency Stopped" statuses
            vehicle.status = "Autonomous Driving";
            vehicle.speed = "45 km/h";
            
            writeVehiclesToFile(currentVehicles); // Write immediately to vehicles.json
            
            res.json({
                hazardDetected: false,
                message: `Normal cruising conditions detected across ${targetZone}. Clear to proceed.`,
                actionPlan: "Maintain standard autonomous velocity profiles."
            });
        }
    }
});
});
    
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(` Autonomous Vehicle API is live at http://localhost:${PORT}`);
    console.log(` DATA PERSISTENCE RUNNING: Writing modifications directly to vehicles.json!`);
    console.log(`======================================================\n`);
});


# 🚀 Automated Fleet Telematics & Dynamic Hazard Routing System

A modular, full-stack vehicle tracking backend simulation framework built with Node.js and Express. This system models real-time operational data processing, state machine telemetry tracking, and dynamic velocity recalculations based on simulated environmental or infrastructural hazards.

---

## 🏗️ System Architecture & Data Schema

The platform coordinates structural parameter validation against flat-file JSON databases, tracking asset changes using lightweight REST endpoints.

* `server.js`: The central Express application pipeline managing routing constraints, middleware parsing, and filesystem persistence logic.
* `vehicles.json`: Core telemetry store modeling asset speed, coordinates, fuel indices, and active deployment status metrics.
* `hazards.json`: Contextual safety registry identifying regional obstructions to recalculate safe operation thresholds.

---

## 🛠️ Tech Stack & Dependencies

* **Runtime Environment:** Node.js (Asynchronous, event-driven architecture)
* **Backend Framework:** Express.js (RESTful routing API structure)
* **Data Control Layer:** Native Filesystem Module (`fs`) for state persistence
* **Frontend Interface:** Reactive HTML5/CSS3 rendering real-time statistics via Chart.js data streams
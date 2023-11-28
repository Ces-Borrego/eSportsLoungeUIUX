let psList;
import('ps-list').then(module => {
    psList = module.default;
}).catch(error => console.error('Failed to load ps-list module', error));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));


let isTracking = false; // Control variable
let gameRuntime = {}; // Object to store the runtime of each game

// Function to check if a game is running
async function isGameRunning(gameName) {
    const processes = await psList();
    return processes.some(process => process.name.toLowerCase().includes(gameName.toLowerCase()));
}

// Main monitoring function
async function startTracking(gamesToMonitor) {
    console.log('Monitoring started...');
    isTracking = true; // Start tracking
    gameRuntime = gamesToMonitor.reduce((acc, game) => {
      acc[game] = 0;
      return acc;
    }, {});

    try {
        while (isTracking) { // Check control variable in each loop
            for (const game of gamesToMonitor) {
                if (await isGameRunning(game)) {
                    gameRuntime[game] += 1; // Increment runtime by 1 second
                }
            }
            await sleep(1000); // Wait for 1 second before checking again
        }
    } catch (error) {
        console.error(error);
    } finally {
        // Print the runtime when the script is stopped
        for (const [game, runtime] of Object.entries(gameRuntime)) {
            console.log(`${game} was running for ${runtime} seconds.`);
        }
    }
}

// Exported function to stop tracking
function stopTracking() {
    console.log('Monitoring stopped...');
    isTracking = false; // Signal to stop tracking
}

module.exports = { startTracking, stopTracking };

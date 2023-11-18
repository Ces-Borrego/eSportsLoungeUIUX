import psList from 'ps-list';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

console.log('Monitoring started...');

// List of applications to monitor
const applicationsToMonitor = ['DW4Windows.exe', 'zoom', 'speedtest', 'sublime_text', 'chrome'];

// Dictionary to store application runtime
const applicationRuntime = applicationsToMonitor.reduce((acc, app) => {
  acc[app] = 0;
  return acc;
}, {});

// Function to check if an application is running
async function isAppRunning(appName) {
    const processes = await psList();
    return processes.some(process => process.name.toLowerCase().includes(appName.toLowerCase()));
}

// Main monitoring loop
(async () => {
    try {
        while (true) {
            for (const app of applicationsToMonitor) {
                if (await isAppRunning(app)) {
                    applicationRuntime[app] += 1; // Increment runtime by 1 second
                }
            }
            await sleep(1000); // Wait for 1 second before checking again
        }
    } catch (error) {
        console.error(error);
    } finally {
        // Print the runtime when the script is stopped
        for (const [app, runtime] of Object.entries(applicationRuntime)) {
            console.log(`${app} was running for ${runtime} seconds.`);
        }
    }
})();

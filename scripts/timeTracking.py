import psutil
import time

# List of applications to monitor
applications_to_monitor = ['discord.exe', 'zoom.exe','speedtest.exe','sublime_text.exe', 'chrome.exe']

# Dictionary to store application runtime
application_runtime = {app: 0 for app in applications_to_monitor}

# Function to check if an application is running
def is_app_running(app_name):
    for process in psutil.process_iter(['pid', 'name']):
        if app_name.lower() in process.info['name'].lower():
            return True
    return False

# Main monitoring loop
try:
    while True:
        for app in applications_to_monitor:
            if is_app_running(app):
                application_runtime[app] += 1  # Increment runtime by 1 second
        time.sleep(1)  # Wait for 1 second before checking again
except KeyboardInterrupt:
    # Print the runtime when the script is stopped
    for app, runtime in application_runtime.items():
        print(f"{app} was running for {runtime} seconds.")

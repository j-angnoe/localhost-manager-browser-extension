

async function main() {
    var backendConnected = false;

    const SETTINGS_KEY = 'DossierFlextensionSettings';

    try { 
        var settings = await browser.storage.local.get(SETTINGS_KEY);
        settings = JSON.parse(settings[SETTINGS_KEY]);
    } catch (err) {
        console.log(err);
        var settings = {};
    }

    console.log('settings', settings);

    if (!settings.port || !settings.token) {
        backendConnected = false;    
    } 

    var flextensionClient = require('flextension-server/client')(settings);

    flextensionClient.registerBackend({
        requires: ['glob','path','fs','child_process'],
        LOCALHOSTRC: null,
        spawnedProcesses: [],
        state: {},
        init() {
            this.LOCALHOSTRC = this.path.join(process.env.HOME, '.localhostrc')
            this.state = this.readState();
            console.log("Shit is online", this.state);
        },
        readState() {
            try { 
                var state = JSON.parse(this.fs.readFileSync(this.LOCALHOSTRC));
            } catch (ignore) {
                var state = {};
            }

            state.solutions = state.solutions || {};

            return state;
        },
        writeState() {
            try { 
                this.fs.writeFileSync(this.LOCALHOSTRC, JSON.stringify(this.state, null, 3));
            } catch (ignore) {
                console.error("Could not write state file: " + ignore);
            }
        },
        rpc: {
            getSolutions(args) {
                console.log("Get solutions to ", args);
                console.log(this.state);
                //console.log('getSolutions', args, this.state.solutions[args.port] || []);
        
                return this.state.solutions[args.port] || [];
            },
        
            complete(args) {
                var comps = this.glob.sync(this.path.join(this.process.env.HOME, args.directory) + '*/', {nocase: 1});
                
                console.log(comps);
        
                comps = comps.map(c => {
                    return c.substr(this.process.env.HOME.length + 1)
                });
        
                console.log('completions', comps);
        
                if (comps.length === 1) {
                    return comps[0];
                } else {
                    return comps;
                }
            },
            runCommand(args) {
                const { spawn } = this.child_process;
        
                var { port } = args;
        
                var child = spawn('bash', ['-c', args.command], {
                    cwd: this.path.join(this.process.env.HOME, args.directory),
                    stdio: 'inherit'
                });
        
                // Should add this?
                this.state.solutions[port] = this.state.solutions[port] || [];
                console.log(this.state.solutions);
        
                var existingSolution = this.state.solutions[port].find(s => {
                    return s.directory == args.directory && s.command == args.command
                });
        
                console.log(existingSolution);
        
                var registerSolution = {
                    port: args.port,
                    directory: args.directory,
                    command: args.command, 
                    last_run_at: (new Date).toISOString()
                };
        
                if (!existingSolution) {
                    registerSolution.created_at = (new Date).toISOString();
                    this.state.solutions[port].unshift(registerSolution);
                } else {
                    Object.assign(existingSolution, registerSolution);
                }
        
                this.writeState(this.state);
                
                var registration = {
                    pid: child.pid,
                    ...registerSolution
                };
        
                this.spawnedProcesses.push({
                    ...registration,
                    childProcess: child
                })
        
                return registration;
            }
        }
    });

    flextensionClient.on('ready', () => {
        backendConnected = true;
    });

    var registerRpc = require('browser-extension-tools/browser-rpc').getServer();

    registerRpc({
        async complete(data) {
            if (backendConnected) {
                var result = await flextensionClient.rpc('complete', data);
                console.log('completed', result);
                return result;
            } else {
                console.log("backend was not connected");
            }
        },
        async runCommand(data) {
            //console.log('runCommand', data);

            return flextensionClient.rpc('runCommand', data);
        },
        getSettings() {
            return settings;
        },
        saveSettings(data) {
            console.log("Saving settings", data);

            var store = {};

            store[SETTINGS_KEY] =  res = JSON.stringify({
                port: data.port,
                token: data.token
            });

            browser.storage.local.set(store)

            browser.runtime.reload();
            return true;
        },

        async getSolutions(data) { 
            console.log("BG: getSolutions");
            if (backendConnected) {
                var solutions = await flextensionClient.rpc('getSolutions', data); 
                return solutions;
            }
        },

        switchTab(args) {
            return function(sender) {
                browser.tabs.update(sender.tab.id, {
                    url: args.url
                })
            }
        },
        canExecuteCommand() {
            return backendConnected;
        }
    });

    var listener = function(request) {
        console.log("captured error", request);

        if (request.type === 'main_frame') {
            if (request.error === "NS_ERROR_CONNECTION_REFUSED") {
                browser.tabs.update(request.tabId, {
                    url: '/app.html#/unable-to-connect?url=' + escape(request.url)
                });
                return;
            }
        } 
    }

    browser.webRequest.onErrorOccurred.addListener(listener, {
        urls: [
            'https://localhost/*',
            'http://localhost/*'
        ]
    });

    var headerListener = info => {
        var allowedStatusses = [200, 302];
        
        if (info.tabId > 0 && !~allowedStatusses.indexOf(info.statusCode)) { 
            browser.tabs.executeScript(info.tabId, {
                code: `
                    var div = document.createElement('div');
                    div.style.position = 'fixed';
                    div.style.right = 0;
                    div.style.bottom = 0;
                    div.style.zIndex = 100000;
                    div.style.backgroundColor = 'red';
                    div.innerHTML = ${JSON.stringify(info.url)} + ' = ' + ${JSON.stringify(info.statusCode )};
                    document.body.append(div);

                    setTimeout(() => {
                        document.body.removeChild(div);
                    }, 3000);
                `
            });
        }
    };

    browser.webRequest.onHeadersReceived.addListener(headerListener, {
        urls: [
            'https://localhost/*',
            'http://localhost/*'
        ]
    });

    browser.contextMenus.create({
        title: "Settings",
        contexts: ["page"],
        onclick() {
            browser.tabs.create({
                url: '/app.html#/settings'
            });
        }
    })
}
main();
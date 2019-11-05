

function getClient() {
    
    if (!getClient.wasInitialised) { 
        getClient.requestCounter = 0;
        getClient.requests = {};

        browser.runtime.onMessage.addListener(payload => {
            if (payload.replyTo) {
                getClient.requests[payload.replyTo](payload.result);
            }
        });        

        getClient.wasInitialised = true;
    }
    
    return function(fn, ...args) {
        getClient.requestCounter++;
        var rq = getClient.requestCounter;

        return new Promise(resolve => {
            getClient.requests[rq] = (...args) => {
                delete getClient.requests[rq];
                resolve(...args);
            };

            browser.runtime.sendMessage({
                fn, args, replyTo: rq
            })
        })
    }
}

function getServer() {

    var rpcServices = {};

    if (!getServer.wasInitialised) {
        browser.runtime.onMessage.addListener(async (payload, sender) => {
            if (payload && payload.fn) {
                var result = await rpcServices[payload.fn](...payload.args);
                if (typeof result === 'function') {
                    await result(sender);
                }
                console.log('return to runtime', payload.replyTo, result);
        
                console.log(sender);
                if (sender && sender.tabs) { 
                    browser.tabs.sendMessage(sender.tab.id, {
                        replyTo: payload.replyTo,
                        result
                    });
                } else {
                    browser.runtime.sendMessage(sender.id, {
                        replyTo: payload.replyTo,
                        result
                    });
                }
            }        
        });
        getServer.wasInitialised = true;
    }

    return function register(fn, callback) {
        var services = {};
        if (typeof fn === 'string' && typeof callback === 'function') {
            services[fn] = callback;
        } else {
            services = fn;
        }

        Object.assign(rpcServices, services);
    }
}

module.exports = {
    getClient,
    getServer
}
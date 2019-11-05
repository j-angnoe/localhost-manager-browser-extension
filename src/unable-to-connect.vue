<template>
    <div class="container">
        <div class="centered">
            <div v-if="ableToConnect">
                <h1>Able to connect :-D</h1>
                <p>There is a service running!</p>
                <a :href="url" target="_self">Open {{url}} now.</a>
            </div>
            <div v-if="!ableToConnect">
                <div class="header">
                    <h1>Unable to connect</h1>
                    <p>
                        Firefox can't establish a connection to the server at {{url}} yet ;-).
                    </p>
                </div>

                <div v-if="solutions.length > 0 && !addOtherSolution">
                    <h3>Solutions:</h3>
                    <ul>
                        <li v-for="s in solutions" @click="solve(s)" :title="canExecuteCommand ? 'Click to execute' : 'Click to copy to clipboard'">
                            Run <code>{{s.command}}</code> in <code>~/{{s.directory}}</code>
                        </li>
                    </ul>

                    <a class="mt-3" href="javascript:;" @click="addOtherSolution = true">Add another solution</a>
                </div>
                

                <div v-if="solutions.length == 0 || addOtherSolution">

                    <div v-if="addOtherSolution">
                        <a href="javascript:;" @click="addOtherSolution = false">Cancel and view existing solutions</a>
                    </div>

                    Directory:
                    <input 
                        v-model="directory" 
                        class="form-control" 
                        placeholder="Enter directory, enter tab for completions"
                        @keydown.tab.prevent="showCompletions()"
                        >
                    
                    <div v-if="completions" class="completions">
                        <span v-for="c in completions" @click="directory=c">{{basename(c)}} </span> 
                    </div>

                    Command:
                    <input 
                        v-model="command" 
                        class="form-control" 
                        placeholder="Enter command"
                    >

                    <div class="mt-3">
                        <button v-if="!canExecuteCommand" @click="solve({directory, command})">
                            Copy to clipboard
                        </button>

                        <button :disabled="!canExecuteCommand || !command" @click="runCommand()">Run</button>
                    </div>

                    <div v-if="message" class="mt-3 alert alert-info">{{message}}</div>

                </div>

            </div>


            <div class="note">
                <span v-if="canExecuteCommand">Backend process is running.</span>
                <span v-if="!canExecuteCommand">
                    No backend process running, run it yourself, 
                    or <router-link to="/settings">set it up here</router-link>
                </span>
            </div>
        </div>
    </div>
</template>
<style scoped>
.container {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}
.centered {
     width: 500px;
     background: white;
     border:1px solidrgba(0,0,0,0.2);
     border-radius: 5px;
     box-shadow: 0 0 10px rgba(0,0,0,0.2);
     padding: 20px;
}
.completions {
    font-size: 90%;
}
.note {
    color: #999;
    margin-top: 20px;
    font-size: 90%;
}
a { 
    cursor: pointer;
}
ul > li {
    cursor: pointer;
}
</style>
<script>
var rpc = require('./browser-rpc').getClient();

export default {
    data() {
        return {
            url: '',
            directory: '',
            command: '',
            completions: null,
            solutions: [],
            canExecuteCommand: false,
            addOtherSolution: false,
            ableToConnect: false,
            message: ''
        }
    },
    async mounted() {
        /* 
        this.link('directory').to.localStorage(
            'lastDirectory'
        );

        this.link('command').to.localStorage(
            'lastCommand'
        );
        */
        var url = this.$route.query.url;
        this.url = url;
        this.port = url.match(/:([0-9]+)\//)[1];


        this.checkIsAbleToConnect();
        setInterval(this.checkIsAbleToConnect, 1000);

        rpc('getSolutions', { port: this.port }).then(solutions => {
            this.solutions = solutions;
        });

        this.canExecuteCommand = await rpc('canExecuteCommand');
    },
    methods: {
        async checkIsAbleToConnect() {

            if (!this.ableToConnect) {
                try { 
                    await fetch(this.url);
                    this.ableToConnect = true;
                } catch (ignore) {
                    this.ableToConnect = false;
                }
            }
            this.canExecuteCommand = await rpc('canExecuteCommand');
        },
        async showCompletions() {
            this.completions = null;

            var completions = await rpc('complete', {
                directory: this.directory
            });

            if (typeof completions === 'string') {
                this.directory = completions;
            } else {
                this.completions = completions;
            }
        },
        basename(c) {
            return c.replace(/\/$/,'').split('/').pop();
        },
        async runCommand(args) {
            args = args || {};

            var result = await rpc('runCommand', {
                url: this.url,
                port: this.port,
                directory: args.directory || this.directory,
                command: args.command || this.command
            });

            console.log(result);

            if (result.pid) {
                this.checkIsAbleToConnect();
                //rpc('switchTab', {url: this.url});
            }
        },

        async solve(solution) {
            if (this.canExecuteCommand) {
                await this.runCommand({
                    directory: solution.directory,
                    command: solution.command
                });
                this.message = 'Command is running, please wait a moment for it to get online.';
            } else {
                await this.copyToClipboard(`cd ~/${solution.directory}; ${solution.command}`);

                this.message = 'Command has been copied to clipboard!';
            }
        },
        copyToClipboard(text) {
            return navigator.clipboard.writeText(text);
        }
    }
}
</script>

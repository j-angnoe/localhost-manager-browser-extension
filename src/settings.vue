<template>
    <div>
        <div class="container">
            <div class="col-sm-12">
                <h1>Flextension setup</h1>
                <p>
                    Flextension is a small program that runs on 
                    your computer. It allows this extension to read
                    and write files on your computer. 
                </p>

                <div v-if="flextensionEnabled">
                    <form @submit.prevent="save()">
                        <div class="form-group">
                            Port:<br>
                            <input type="number" v-model="port" class="form-control">
                            <small>Start flextension on your terminal. It will display the port it's listening to</small>
                        </div>
                        <div class="form-group">
                            Token:<br>
                            <input type="text" v-model="token" class="form-control">
                            <small>Flextension will also display a security token, copy-paste it here.</small>
                        </div>
                        <button class="btn btn-primary">Save</button>
                    </form>
                </div>
            </div>
        </div>

        <div class="container">
            <div class="col-sm-12">
                <h1>General Localhost settings</h1>
                <div>
                    <label>
                        <input type="checkbox">
                            Report HTTP errors (404's and 500) using a popup.
                    </label>
                </div>
                <div>
                    <label>
                        <input type="checkbox">
                            Javascript error popup
                    </label>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
.html, body {
    background: #EDEDF0;
    color: rgb(12, 12, 13);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Ubuntu", "Helvetica Neue", sans-serif;
}
</style>
<style scoped>
.container:first-child {
    margin-top: 50px;
}
.container {
    margin-bottom: 20px;
    background: white;
    border:1px solid rgba(0,0,0,0.2);
    border-radius: 5px;
    padding: 30px;
    box-shadow: 0 0 20px rgba(0,0,0,0.1);
}
.form-group {
    margin-bottom: 20px;
}
.form-group small {
    color: rgb(74, 74, 79);
}
</style>

<script>
var rpc = require('browser-extension-tools/browser-rpc').getClient();

export default {
    data() {
        return {
            port: '',
            token: '',
            flextensionEnabled: true
        }
    },
    async mounted() {
        var { port, token} = await rpc('getSettings');
        this.port = port;
        this.token = token;
    },
    methods: {
        save() {
             
            rpc('saveSettings', {
                port: this.port,
                token: this.token
            })

        }
    }    
}
</script>

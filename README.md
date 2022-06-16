# Storing Signed and Encrypted data on IPFS with Ceramic Tools
Need to run 
$ npm install util<br>
in the directory holding the code.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
Use info at:
    https://blog.ceramic.network/how-to-store-signed-and-encrypted-data-on-ipfs/

Requires a local IPFS node running and accessible to connect with.<br>
Requires a local Ceramic daemon running.

For some reason, this currently breaks when executing<br>
_const ipfs = await IPFS.create();_ <br>
in Chrome browser but works in FireFox.
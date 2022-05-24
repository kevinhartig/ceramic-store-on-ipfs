import logo from './logo.svg';
import './App.css';
import * as IPFS from 'ipfs-core';
import * as dagJose from 'dag-jose';
import {useEffect, useRef, useState} from "react";
import { DID } from 'dids'
import { Ed25519Provider } from 'key-did-provider-ed25519'
import KeyResolver from '@ceramicnetwork/key-did-resolver'
import { randomBytes } from '@stablelib/random'

function App() {
    const componentIsMounted = useRef(true);
    const [ipfs, setIpfs] = useState(null);
    const [load, setLoad] = useState(false);

    useEffect(() => {
        return () => {
            componentIsMounted.current = false;
        };
    }, []);

    useEffect(() => {
        async function createDid() {
            try {
                if (!load) return;
                
                // const fs = await IPFS.create({ipld: {codecs: [dagJose]}});
                const fs = await IPFS.create();
                setIpfs(fs);

                // generate a seed, used as a secret for the DID
                const seed = randomBytes(32)

                // create did instance
                const provider = new Ed25519Provider(seed);
                const did = new DID({provider, resolver: KeyResolver.getResolver()});
                await did.authenticate();
                window.did = did;
                console.log('Connected with DID:', did.id);
            } catch (err) {
                console.error(err);
            }
        }

        createDid();

    }, [load]);
    
    return (
        <div className="App">
            <p>
                Edit <code>src/App.js</code> and save to reload.
            </p>
            <button onClick={() => setLoad(true)}>Create DID</button>
        </div>
    );
}

export default App;

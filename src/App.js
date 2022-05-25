import logo from './logo.svg';
import './App.css';
import * as IPFS from 'ipfs-core';
import * as dagJose from 'dag-jose';
import {useEffect, useRef, useState} from "react";
import {CeramicClient} from '@ceramicnetwork/http-client'
import { DID } from 'dids'
import {getResolver as getKeyResolver} from 'key-did-resolver'
import {getResolver as get3IDResolver} from '@ceramicnetwork/3id-did-resolver'
import {ThreeIdProvider} from '@3id/did-provider'

function App() {
    const componentIsMounted = useRef(true);
    const [ipfs, setIpfs] = useState(null);
    const [load, setLoad] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);
    const [did, setDid] = useState(null);

    useEffect(() => {
        return () => {
            componentIsMounted.current = false;
        };
    }, []);

    useEffect(() => {

        async function addSignedObject(did, ipfs, payload) {
            try {
                // sign the payload as dag-jose
                const {jws, linkedBlock} = await did.createDagJWS(payload)

                // put the JWS into the ipfs dag
                const jwsCid = await ipfs.dag.put(jws, {storeCodec: dagJose.name, hashAlg: 'sha2-256'})

                // put the payload into the ipfs dag
                await ipfs.block.put(linkedBlock, jws.link)

                return jwsCid
            } catch (err) {
                console.error(err);
                return null;
            }
        }
        
        async function createDid() {
            try {
                if (!load) return;

                if (!authenticated) {
                    // const fs = await IPFS.create({ipld: {codecs: [dagJose]}});
                    const ipfs = await IPFS.create();
                    setIpfs(ipfs);

                    const authSecret = new Uint8Array(32);
                    crypto.getRandomValues(authSecret);
                    const authId = 'myAuthId';

                    const API_URL = 'http:///localhost:7007';
                    const ceramic = new CeramicClient(API_URL);

                    const threeID = await ThreeIdProvider.create({
                        ceramic: ceramic,
                        authId: authId,
                        authSecret,
                        // This grants all permissions
                        // See https://developers.ceramic.network/reference/accounts/3id-did/
                        getPermission: (request) => Promise.resolve(request.payload.paths),
                    })

                    const did = new DID({
                        provider: threeID.getDidProvider(),
                        resolver: {
                            ...get3IDResolver(ceramic),
                            ...getKeyResolver(),
                        },
                    })

                    await did.authenticate();
                    console.log('Connected with DID:', did.id);
                    setDid(did);

                    // Create signed object
                    const cid1 = await addSignedObject(did, ipfs,{ hello: 'world' })

                    // Log the DagJWS:
                    console.log((await ipfs.dag.get(cid1)).value)
                }
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
            { did && <h2>{did.id}</h2> }
        </div>
    );
}

export default App;

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

        async function addEncryptedObject(did, ipfs, cleartext, dids) {
            const jwe = await did.createDagJWE(cleartext, dids)
            return ipfs.dag.put(jwe, { storeCodec: 'dag-jose', hashAlg: 'sha2-256' })
        }

        async function followSecretPath(did, ipfs, cid) {
            const jwe = (await ipfs.dag.get(cid)).value
            const cleartext = await did.decryptDagJWE(jwe)
            console.log(cleartext)
            if (cleartext.prev) {
                await followSecretPath(did, ipfs, cleartext.prev)
            }
        }
        
        async function createDid() {
            try {
                if (!load) return;

                if (!authenticated) {
                    // const ipfs = await IPFS.create({ipld: {codecs: [dagJose]}});
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
                    const cid1 = await addSignedObject(did, ipfs,{ hello: 'world' });
                    const cid1_copy = await addSignedObject(did, ipfs,{ hello: 'world' });

                    // Log the DagJWS:
                    console.log((await ipfs.dag.get(cid1)).value)

                    // Log the payload:
                    await ipfs.dag.get(cid1, { path: '/link' }).then(b => console.log(b.value))

                    // Create another signed object that links to the previous one
                    const cid2 = await addSignedObject(did, ipfs,{ hello: 'getting the hang of this', prev: cid1 })

                    // Log the new payload:
                    await ipfs.dag.get(cid2, { path: '/link' }).then(b => console.log(b.value))

                    // Log the old payload:
                    await ipfs.dag.get(cid2, { path: '/link/prev/link' }).then(b => console.log(b.value))

                    const jws1 = await ipfs.dag.get(cid1)
                    const jws2 = await ipfs.dag.get(cid2)

                    // verify signing
                    await did.verifyJWS(jws1.value).then(b => console.log("object was signed with id: " + b.didResolutionResult.didDocument.id))
                    await did.verifyJWS(jws2.value).then(b => console.log("object was signed with id: " + b.didResolutionResult.didDocument.id))

                    //create and store encrypted json object
                    const cid3 = await addEncryptedObject(did, ipfs, { hello: 'secret' }, [did.id])
                    const cid4 = await addEncryptedObject(did, ipfs,{ hello: 'cool!', prev: cid3 }, [did.id])

                    // retrieve a single object
                    await followSecretPath(did, ipfs, cid3)

                    // retrieve linked objects
                    await followSecretPath(did, ipfs, cid4)
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
                Store signed and encrypted data on IPFS
            </p>
            <button onClick={() => setLoad(true)}>Create DID</button>
            { did && <h2>{did.id}</h2> }
        </div>
    );
}

export default App;

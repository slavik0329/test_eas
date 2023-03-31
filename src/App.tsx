import { useState, useEffect } from "react";
import {
  EAS,
  Offchain,
  SchemaEncoder,
  SchemaRegistry,
  Delegated,
  ZERO_BYTES32,
} from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import { Buffer } from "buffer";

import "./App.css";

export const EASContractAddress = "0xC2679fBD37d54388Ce493F1DB75320D236e1815e"; // Sepolia v0.26
const gitcoinVCSchema =
  "0x853a55f39e2d1bf1e6731ae7148976fbbb0c188a898a233dba61a233d8c0e4a4";

function App() {
  const [provider, setProvider] =
    useState<ethers.providers.Web3Provider | null>(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    console.log("ethers.providers.Web3Provider", ethers.providers);
    const p = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(p);
  }, []);

  const connectToMetamask = async () => {
    if (provider) {
      const accounts = await provider.send("eth_requestAccounts", []);

      setAccount(accounts[0]);
      const _chainId = await provider.send("eth_chainId", []);

      console.log("Chain id", _chainId);
      const chainIdNumber = parseInt(_chainId, 16);
      setChainId(chainIdNumber);

      console.log("Accounts: ", accounts);
    }
  };

  const createOnChainAttestation = async () => {
    const eas = new EAS(EASContractAddress);
    eas.connect(provider.getSigner());
    // Initialize SchemaEncoder with the schema string

    const schemaEncoder = new SchemaEncoder("string provider, string hash");
    const encodedData = schemaEncoder.encodeData([
      { name: "provider", value: "TestProvider", type: "string" },
      { name: "hash", value: "234567890", type: "string" },
    ]);

    const newAttestationUID = await eas.attest({
      data: {
        recipient: "0x4A13F4394cF05a52128BdA527664429D5376C67f",
        // Unix timestamp of when attestation expires. (0 for no expiration)
        expirationTime: 0,
        revocable: true,
        data: encodedData,
      },
      schema: gitcoinVCSchema,
    });
  };

  const delegatedAttestationRequest = async () => {
    const wallet = ethers.Wallet.fromMnemonic(
      "chief loud snack trend chief net field husband vote message decide replace"
    );
    // Initialize SchemaEncoder with the schema string
    const schemaEncoder = new SchemaEncoder("string provider, string hash");
    const encodedDataString = schemaEncoder.encodeData([
      { name: "provider", value: "TestProvider", type: "string" },
      { name: "hash", value: "234567890", type: "string" },
    ]);

    if (provider && account && chainId) {
      const delegated = new Delegated({
        address: EASContractAddress,
        chainId: chainId,
        version: "1",
      });
      console.log("encodedDataString:", encodedDataString);
      const encodedData = Buffer.from(encodedDataString.substring(2), "hex");
      console.log("encodedData:", encodedData);
      console.log("wallet._isSigner", wallet._isSigner);

      console.log("signing atttestation ...");
      try {
        const delegatedAttestation = await delegated.signDelegatedAttestation(
          {
            schema: gitcoinVCSchema,
            recipient: "0x4A13F4394cF05a52128BdA527664429D5376C67f",
            expirationTime: ethers.BigNumber.from(0),
            revocable: false,
            refUID: ZERO_BYTES32,
            data: encodedData,
            // ----
            nonce: ethers.BigNumber.from(0),
          },
          wallet
        );

        console.log("delegatedAttestation", delegatedAttestation);
        console.log("provider", provider);
        console.log("wallet.address", wallet.address);
        console.log("wallet.address", wallet.address);
        const eas = new EAS(EASContractAddress);
        eas.connect(provider.getSigner());
        // eas.connect(wallet);

        const tx = await eas.attestByDelegation({
          schema: delegatedAttestation.message.schema,
          data: {
            recipient: delegatedAttestation.message.recipient,
            expirationTime: delegatedAttestation.message.expirationTime,
            revocable: delegatedAttestation.message.revocable,
            data: encodedDataString,
          },
          signature: delegatedAttestation,
          attester: wallet.address,
        });
      } catch (e) {
        console.error("Error:", e);
      }
    }
  };

  return (
    <div className="App">
      <h1>EAS Test</h1>
      <div>
        <button onClick={connectToMetamask}>Connect to Metamask</button>
      </div>
      <div>{account}</div>
      <button onClick={delegatedAttestationRequest}>
        Create delegated Attestation
      </button>
      <button onClick={createOnChainAttestation}>
        Create onchian attestation
      </button>
    </div>
  );
}

export default App;

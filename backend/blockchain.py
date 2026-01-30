import os
import json
from web3 import Web3
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class BlockchainManager:
    """
    Manages actual blockchain interactions for Sustainability Credits.
    Supports Sepolia Testnet (Ethereum) out of the box.
    """
    
    def __init__(self):
        self.rpc_url = os.getenv('BLOCKCHAIN_RPC_URL')
        self.private_key = os.getenv('BLOCKCHAIN_PRIVATE_KEY')
        self.contract_address = os.getenv('CONTRACT_ADDRESS') or os.getenv('VITE_CONTRACT_ADDRESS')
        
        if self.rpc_url:
            self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        else:
            self.w3 = None

        if self.w3 and self.w3.is_connected():
            print(f"🔗 Connected to Blockchain: {self.rpc_url}")
            # Load account from private key
            if self.private_key:
                try:
                    self.account = self.w3.eth.account.from_key(self.private_key)
                    self.address = self.account.address
                    print(f"🏦 Wallet Node Address: {self.address}")
                except Exception as e:
                    print(f"⚠️ Failed to load wallet from private key: {e}")
            
            # Load Contract ABI (Standard ERC20 + Custom awardCredits)
            self.abi = [
                {
                    "inputs": [
                        {"internalType": "address", "name": "student", "type": "address"},
                        {"internalType": "uint256", "name": "amount", "type": "uint256"},
                        {"internalType": "string", "name": "actionType", "type": "string"},
                        {"internalType": "string", "name": "roomId", "type": "string"}
                    ],
                    "name": "awardCredits",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {"internalType": "address", "name": "account", "type": "address"}
                    ],
                    "name": "balanceOf",
                    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "decimals",
                    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        {"internalType": "address", "name": "to", "type": "address"},
                        {"internalType": "uint256", "name": "value", "type": "uint256"}
                    ],
                    "name": "transfer",
                    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }
            ]
            
            self.contract = None
            self._decimals = 18 # Default
            if self.contract_address:
                try:
                    self.contract = self.w3.eth.contract(address=Web3.to_checksum_address(self.contract_address), abi=self.abi)
                    self._decimals = self.contract.functions.decimals().call()
                    print(f"📄 Contract Initialized at {self.contract_address}")
                except Exception as e:
                    print(f"⚠️ Could not fully initialize contract: {e}")
        else:
            self.w3 = None
            self.contract = None
            print("ℹ️ No Blockchain RPC found or connection failed. Running in Ledger-Simulation mode.")

    @property
    def is_connected(self):
        """Check live connection status"""
        if self.w3:
             return self.w3.is_connected()
        return False

    def mint_credits(self, target_address, amount, action_type="verified_action", room_id="CS_LAB"):
        """
        Actually mints/awards tokens on the blockchain.
        Returns the transaction hash.
        """
        if not self.is_connected or not self.contract or not self.private_key:
            # Fallback to simulation
            tx_hash = f"0x_sim_{datetime.now().timestamp()}"
            print(f"🧪 [SIMULATION] Awarded {amount} CSC to {target_address} ({action_type})")
            return tx_hash

        try:
            # Build transaction
            nonce = self.w3.eth.get_transaction_count(self.address)
            
            # Simple award function call (converts to base units using decimals)
            tx = self.contract.functions.awardCredits(
                Web3.to_checksum_address(target_address),
                int(amount),
                action_type,
                room_id
            ).build_transaction({
                'from': self.address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price
            })

            # Sign and send
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            print(f"🚀 Blockchain Transaction Sent: {tx_hash.hex()}")
            return tx_hash.hex()
            
        except Exception as e:
            print(f"❌ Blockchain Transaction Failed: {e}")
            return None

    def get_wallet_balance(self, address):
        """Get balance of specific wallet in CSC tokens"""
        if not self.is_connected or not self.contract:
            return 0.0
        
        try:
            raw_balance = self.contract.functions.balanceOf(Web3.to_checksum_address(address)).call()
            return raw_balance / (10 ** self._decimals)
        except Exception as e:
            print(f"⚠️ Balance check failed: {e}")
            return 0.0

    def transfer_credits(self, to_address, amount):
        """Perform a peer-to-peer transfer of credits on-chain"""
        if not self.is_connected or not self.contract or not self.private_key:
            return None
            
        try:
            nonce = self.w3.eth.get_transaction_count(self.address)
            value = int(amount * (10 ** self._decimals))
            
            tx = self.contract.functions.transfer(
                Web3.to_checksum_address(to_address),
                value
            ).build_transaction({
                'from': self.address,
                'nonce': nonce,
                'gas': 100000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            return tx_hash.hex()
        except Exception as e:
            print(f"❌ Transfer failed: {e}")
            return None

if __name__ == "__main__":
    # Test simulation mode
    bm = BlockchainManager()
    bm.mint_credits("0x1234567890123456789012345678901234567890", 50)

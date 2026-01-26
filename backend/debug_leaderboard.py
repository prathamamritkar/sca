from database import Database
db = Database()
print("Starting leaderboard query...")
leaderboard = db.get_leaderboard()
print(f"Success! Found {len(leaderboard)} entries.")
for entry in leaderboard:
    print(entry)

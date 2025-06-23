# 🌟 WebGUser Module: The App You Never Knew You Needed 🌟

<div align="center">
  
  ![Visitors](https://img.shields.io/badge/Visitors-Probably_Just_You-red)
  ![Build Status](https://img.shields.io/badge/Build_Status-Works_On_My_Machine-success)
  ![Bugs](https://img.shields.io/badge/Bugs-Features_In_Disguise-yellow)
  ![Coffee](https://img.shields.io/badge/Powered_By-Excessive_Coffee-brown)

  <p align="center">
    <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmZjMzk3ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0/13HgwGsXF0aiGY/giphy.gif" width="450" />
  </p>

  <h3>Because the world definitely needed another user tracking app</h3>
</div>

## 🤔 What Is This Masterpiece?

WebGUser Module is a groundbreaking application that does... well, user stuff with geolocation. Revolutionary, right? It's like Uber meets Facebook meets your boss's wildest micromanagement dreams. We track users, we track tasks, we track everything except where all your development time went.

<p align="center">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmZjMzk3ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0/3oKIPnAiaMCws8nOsE/giphy.gif" width="350" />
</p>

## ✨ Features That Will Blow Your Mind (Or At Least Mildly Impress You)

- 📱 **Cross-platform**: Works on iOS, Android, and Web! (Results may vary. Significantly.)
- 🔐 **Authentication**: Because we need to know EXACTLY who's procrastinating
- 📷 **Image Upload**: For those moments when you need to prove you're actually working
- 🔔 **Notifications**: To remind you of all the tasks you're avoiding
- 📍 **Location Tracking**: We know where you are. Always. *Evil laugh*
- 📊 **Task Management**: Like your todo list, but with more judgment
- 🌓 **Dark Mode**: For coding at 3 AM when you realize the deadline is tomorrow

## 🛠️ Tech Stack (AKA "Stuff We Googled How To Use")

### Frontend
- **React Native**: Because native development was too straightforward
- **Expo**: For when you want to build mobile apps but hate yourself just a little
- **TypeScript**: JavaScript, but with more ways to feel bad about your code

### Backend
- **Node.js & Express**: The Toyota Corolla of backend frameworks - not exciting, but it gets you there
- **MongoDB**: Because SQL relationships are too much like real relationships - complicated
- **JWT**: For security that's *probably* good enough
- **Geolib**: To calculate exactly how far you are from where you should be

## 🚀 Installation (Good Luck)

<p align="center">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmZjMzk3ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0/DHqth0FVQZILe/giphy.gif" width="350" />
</p>

### Prerequisites (Things You Should Have But Probably Don't)

- **Node.js**: Version 16+ (or whatever version works this week)
- **MongoDB**: Running somewhere (local, Atlas, or scribbled on a napkin)
- **XAMPP**: Because we're fancy like that
- **Patience**: Lots of it
- **Therapy**: On standby

### Backend Setup (Where Dreams Go To Die)

1. **Clone this monstrosity**
   ```bash
   git clone <repository-url>
   cd webgusermodule
   ```

2. **Set up the backend**
   ```bash
   cd Backend
   npm install # Grab a coffee, this might take a while
   ```

3. **Create a .env file with your secrets**
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/webguserdb
   JWT_SECRET=your-super-secret-key-that-you-definitely-wont-commit-accidentally
   EMAIL_USER=your.email@gmail.com
   EMAIL_PASS=your-email-password-in-plaintext-because-security-is-overrated
   ```

4. **Start the backend server**
   ```bash
   npm run dev # Watch it crash spectacularly
   ```

### Frontend Setup (The Pretty Mess)

1. **Navigate to the frontend directory**
   ```bash
   cd ../frontend
   npm install # Time for another coffee
   ```

2. **Start the frontend**
   ```bash
   npm start # Cross your fingers
   ```

3. **Choose your platform of pain**
   ```bash
   # iOS (Mac only, sorry Windows peasants)
   npm run ios
   
   # Android (Hope you have 50GB of free space for Android Studio)
   npm run android
   
   # Web (The only one that might actually work)
   npm run web
   ```

## 🧪 Project Structure (Chaos, Organized)

```
webgusermodule/
├── Backend/                # Where the magic happens (sometimes)
│   ├── config/             # Configuration files and secrets we shouldn't commit
│   ├── Controller/         # Business logic (or what passes for it)
│   ├── middleware/         # Code that runs before other code
│   ├── model/              # MongoDB schemas (our data, but fancy)
│   ├── routes/             # API endpoints (the doors to our castle)
│   ├── utils/              # Helper functions (because we're lazy)
│   └── server.cjs          # The heart of the operation
│
├── frontend/               # The pretty face of our application
│   ├── app/                # Screens and navigation
│   ├── assets/             # Images, fonts, and other things we "borrowed"
│   ├── components/         # Reusable UI pieces
│   ├── constants/          # Values we were too lazy to make configurable
│   ├── context/            # Global state (where bugs hide)
│   ├── hooks/              # Custom React hooks (magic)
│   └── utils/              # More helper functions (we're REALLY lazy)
```

## 🚨 Common Issues (AKA "It's Not a Bug, It's a Feature")

1. **"The app crashes on startup"**
   - Solution: Have you tried turning it off and on again?

2. **"MongoDB connection fails"**
   - Solution: Are you sure MongoDB is running? Did you sacrifice the required goat?

3. **"The location tracking doesn't work"**
   - Solution: Maybe your device is in the Bermuda Triangle. Or you denied permissions. Probably the Triangle.

4. **"I'm getting weird TypeScript errors"**
   - Solution: `// @ts-ignore` is your friend. Embrace it.

5. **"The notifications aren't showing up"**
   - Solution: Consider yourself lucky.

## 📞 Support & Contact

For questions, issues, or existential crises related to this project:

1. **Try Google first** (let's be honest, that's what we'd do)
2. **Check Stack Overflow** (where all our code came from anyway)
3. **If desperate:** Email omshrikhande73@gmail.com (response time measured in geological eras)

## 🧠 Words of Wisdom

<p align="center">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmZjMzk3ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0/7zJivlhQurdLVTeeX6/giphy.gif" width="400" />
</p>

> "This app is like a Swiss Army knife - it does many things, none of them particularly well." - Anonymous Developer

> "60% of the time, it works every time." - Project Manager

> "It's not about the destination, it's about the bugs we fixed along the way." - Senior Developer

## 📄 License

This project is licensed under the "Please Don't Sue Us" License - use it at your own risk, we certainly do.

---

<div align="center">
  <p>Built with ❤️, 😭, and an unhealthy amount of ☕</p>
  
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmZjMzk3ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0ZDM0ZDRiMzA0ZDRiMzg0YzQ0/l3q2K5jinAlChoCLS/giphy.gif" width="150" />
</div>

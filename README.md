# 320ProjectBackEnd

## Project Overview

This is the back-end repo for the UMOC Web Locker. The UMOC Web Locker is a web application that allows users (primarily members of the UMass Outing Club) to view the available gear in the physical gear locker and check-out any items they need for personal or club use.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Authentication](#authentication)
- [Firestore Collections](#firestore-collections)
- [Contributing](#contributing)

## Features

- User registration and authentication
- Firestore integration for storing user and gear data
- CSV parsing for database synchronization

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js and npm (Node Package Manager)
- Firebase CLI (for deployment and management)

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/aravadikesh/320-Team-3-BackEnd.git
   ```

2. **Navigate to the project directory:**

    ```bash
    cd 320ProjectBackEnd
    ```

3. **Install dependencies:**

    ```bash
    npm install -g firebase-tools
    ```

4. **Run project locally:**

    ```bash
    firebase init hosting
    - say No to web framework
    /test-hosting npm i
    /functions npm i
    /functions npm run build
    /root firebase emulators:start
    ```

You will receive a link from which the API calls are being hosted. If you have access to the front-end, you don't need to do anything with this link, just open the site and go from there.

## Usage

The back-end is composed primarily of API calls using Express.js. Some examples include:
- Create a user
- Log in/sign out a user
- Get all users
- Get user by email/SPIRE/UID
- Get gear held by user with email/SPIRE
- Check out gear for user
- and more...

## Authentication

Using email and password verification, we use Firebase's Authentication service to ensure secure storage of sensitive account information. UIDs for users are created automatically and are synced between Firestore and Authentication akin to a relational database.

## Firestore Collections

The majority of data related to this project can be found in Firebase's Firestore Database under these collections:

1. **Gears Collection**

A collection of documents related to gear items, with fields such as:
- Name
- Gear ID
- Brand
- Color
- Checked in/out (boolean)
- and more...

2. **Users Collection**

A collection of documents related to user accounts, with fields such as:
- Name
- Email
- SPIRE ID
- Phone Number
- and more...

Keep in mind we do not store account passwords in the Users collection. This is stored only in the Authentication database.

3. **Logs Collection**

A collection of documents related to when individual gear items are checked in/out.
- Date (of update)
- Gear ID
- Customer ID
- Leader ID

## Contributing

The back-end was built by Arav Adikesh, Inbar Artzi, and Ian McKenna.
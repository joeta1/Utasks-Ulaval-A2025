# UTasks - Manage Your Tasks as you Want!
UTasks is a Trello-like web application built with **Vue 3**, **TypeScript**, and **TailwindCSS**.  
It allows users to create an account, log in, and manage their tasks by creating, editing, and organizing boards, lists, and cards through a clean and interactive interface.
> Warning: In this first version, authentication is simplified: users only need to enter a username to be instantly redirected to their profile (no token handling yet).

## Features
- Create a user by entering a username (instant login for this version)
- Create / Delete / Edit boards, lists, and cards
- View all user boards, lists, and cards
- Drag & drop cards between lists
- Reordering lists
- Filter cards by priority, date, or both

## Technologies
- [**Vue 3**](https://vuejs.org/) – framework for building interactive modern web apps  
- [**TypeScript**](https://www.typescriptlang.org/) – typed superset of JavaScript  
- [**TailwindCSS**](https://tailwindcss.com/) – utility-first CSS framework  
- [**ESLint**](https://eslint.org/) – identifies and fixes code quality issues

## Installation and Running on Local Server (On your IDE)
- Step 1: clone the repository
- Step 2:  enter the command `npm install` on your terminal
- Step 3:  `npm run dev`
- Step 4: The application will be running at `http://localhost:5173`

## Directives for using the app
While this version is still under testing, please follow these notes:

On launch, you will be asked to create a username.
To avoid API conflicts, use unique usernames like JordanEtaba15, JordanEtaba16, etc.

The Logout button temporarily deletes the user from the API database and returns you to the home page.
This allows you to reuse the same username multiple times without errors.

Note: The app already uses an public API provided at `https://utasks-026af75f15a3.herokuapp.com/`.

You can also access to Documentation here: `https://utasks-026af75f15a3.herokuapp.com/docs/#/`


## Contributors
- Jordan Etaba Bikoun

# Tanya's ENA Desktop continued!
This is a continuation of the abandoned ENA desktop made by Tanya (developer of the JoelGC website and more)

This is being continued by members of the community independently, Tanya has stated "I don’t plan to make future updates to the current source code since I want to work on one from scratch, specifically so that it works with all operating systems"

They have also stated "I point out many errors, that’s why I prefer to do everything from scratch. I don’t mind if they want to fix those errors on their own"

# Why?
Because it's fun :3

# Compilation and Installation

Instructions on how to compile it

### Via Electron
#### Requires npm

1. Go to [Electron v24.3.1](https://github.com/electron/electron/releases/tag/v24.3.1) and download the appropriate electron version for your OS
2. Extract the zip file and go to `/resources`
3. Delete the contents of the folder and create folder `/app` inside
4. Put this repository's contents into the new `/app` directory
5. Open a terminal and run `npm install`

### Via Releases
1. Go to releases
2. Download the correct release for your OS

### Via installed version
#### Using app.asar
1. Go to releases
2. Download `app.asar`
3. Replace `app.asar` or `/app` in `/resources`
#### Using source
1. Download source
2. Unzip (if zipped) to `/app`
3. Replace `app.asar` or `/app` in `/resources`
### Using git (Terminal)
1. Remove `app.asar` if it exists (you will lose your preferences, saves, and any modifications) 
2. Run `git clone https://gitlab.com/TheDiamondfinderNG/ena-desktop-continued.git` in `/resources/app`
    - If you want to clone a specific branch other than master, use `git clone -b <branch-name>`
3. If you want to update it, you can use git pull

Any method will work and leave the code modifiable

# ZDragon

ZDragon is a architecture as code tool. This tool is still in early alpha and should not 
be used without explicit knowledge of the application and the code. If you want to get 
started using ZDragon; feel free to contact [me](mailto:info@zdragon.org).

The basics of ZDragon are written down in these documents.

# Development Requirements

 * Java > 1.6
 * dotnet > 5.0


## Project Structure

 * CLI (still in development, do not use)
 * Compiler (The ZDragon compiler)
 * Compiler.Test (The tests for the ZDragon, bigger than only the Compiler REFACTOR)
 * PlantUml.Net (A runner for the PlantUML `jar` file distributed with ZDragon)
 * ZDragon.Project (The project logic, like creating applications, files and compiling them on save)
 * ZDragon.Transpilers (The transpilers for:)
    * PlantUml C4 Components
    * PlantUml Class Diagrams
    * Html
    * Gantt Charts
    * TypeScript
    * JsonSchema
 * ZDragon.UI (The web application hosting ZDragon)
    * Electron.Net
    * Svelte for the actual UI
    * ASP.NET core for the interactions between server and client

## Running ZDragon from Source

Test to make sure you have the right version of Java installed:

```
> java -version

java version "1.8.0_281"
Java(TM) SE Runtime Environment (build 1.8.0_281-b09)
Java HotSpot(TM) Client VM (build 25.281-b09, mixed mode)
```

Test to make sure you have the right version of dotnet installed:

```
> dotnet --version
5.0.100
```

Get the latest version from github:

*Make sure you are in a directory where you'll want to put the source code!*

```
git clone https://github.com/Baudin999/ZDragon.git
```

Go to the directory you cloned the repo, for me this is `D:\Projects\ZDragon`

```
cd D:\Projects\ZDragon
cd ZDragon.UI
dotnet run
```

If everything is running you'll see the following:

```
PS D:\Projects\ZDragon\ZDragon.UI> dotnet run
info: Microsoft.Hosting.Lifetime[0]
      Now listening on: https://localhost:5001
info: Microsoft.Hosting.Lifetime[0]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[0]
      Application started. Press Ctrl+C to shut down.
info: Microsoft.Hosting.Lifetime[0]
      Hosting environment: Development
info: Microsoft.Hosting.Lifetime[0]
      Content root path: D:\Projects\ZDragon\ZDragon.UI
```

You will also, probably, get challenges because of the dev HTTP(s) certificate which dotnet
core uses. I personally ignore those; but I fully understand it if you don't want to. In 
this case, use the non HTTP(s) url. 

Once the application is up and running go to the local url in a (modern) browser.

## Compiling the UI

The UI is not 'git ignored' by default, this is why "everything just works". If you want to 
compile the UI yourself you need to go to the `ZDragon.UI/ClientApp` folder and run the 
following commands:


```
cd D:\Projects\ZDragon\ZDragon.UI\ClientApp\
npm install
npm run dev
```

The UI is a [Svelte](https://svelte.dev/) application.



# Syntax

The ZDragon syntax documentation is still being worked on. This will go live soon.

# Contributing

Currently we're not taking pull-requests. Logging issues is the best way you can help us out. As 
soon as we have the organisational structure in order we will let you know.
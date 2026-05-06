# Sweet Home 3D - Installation and Running Guide

## Overview
Sweet Home 3D is a free interior design application that helps users draw the plan of their house, arrange furniture on it and visit the results in 3D.

## Prerequisites
- Java 21 (OpenJDK)
- Apache Ant (for building from source)

## Installation Steps

### 1. Install Dependencies
```bash
# Install Java 21
sudo apt update
sudo apt install openjdk-21-jdk

# Install Apache Ant
sudo apt install ant
```

### 2. Build the Application
```bash
# Navigate to the project directory
cd sweethome3d-swt

# Build the application
ant jarExecutable
```

### 3. Run Sweet Home 3D

#### Option A: Using the launcher script
```bash
./run_sweethome3d.sh
```

#### Option B: Direct command
```bash
java --add-opens java.desktop/sun.awt=ALL-UNNAMED -jar install/SweetHome3D-4.1.jar
```

## Troubleshooting

### Java 3D Compatibility Issues
If you encounter errors related to Java 3D and sun.awt modules, the `--add-opens` JVM argument is required for Java 21 compatibility.

### Build Issues
- Ensure Java 8 source/target compatibility in build.xml
- Exclude SWT files for Swing-only build
- Fix legacy Vector generics usage

## Features
- Draw house plans with walls, rooms, and dimensions
- Arrange furniture from a catalog
- 3D visualization with virtual visit
- Export plans and 3D views
- Multi-language support

## Version
Sweet Home 3D 4.1 (2013-era software, successfully built and running on modern systems)
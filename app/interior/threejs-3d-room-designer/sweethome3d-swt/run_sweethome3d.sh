#!/bin/bash
# Sweet Home 3D Launcher Script
# This script runs Sweet Home 3D with the necessary JVM arguments for Java 21 compatibility

cd "$(dirname "$0")"
java --add-opens java.desktop/sun.awt=ALL-UNNAMED -jar install/SweetHome3D-4.1.jar
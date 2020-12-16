# BMP280 adapter for WebThings Gateway

## Manual installation
Copy the project folder into ~/.webthings/addons:
```
scp -r bmp280-adapter pi@pi:.webthings/addons/
```

Then connect on the device and launch packaging script (this may take a long time because of the compilation of some dependencies):
```
cd .webthings/addons/bmp280-adapter && ./package.sh
```

Finally, restart WebThings Gateway:
```
sudo systemctl restart webthings-gateway.service
```

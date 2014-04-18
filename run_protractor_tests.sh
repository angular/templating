set -e


# Download Selenium.
curl http://selenium-release.storage.googleapis.com/2.41/selenium-server-standalone-2.41.0.jar -O


# Custom build of chromium (that allows fetching Shadow DOM elements):
# b1eec64fa08bed06446c39d3dbce20adeefc63dc
OS=$(uname -s)
if [[ $OS = "Darwin" ]]; then
  CHROMEDRIVER_BIN=./chromedriver_mac
elif [[ $OS = "Linux" ]]; then
  CHROMEDRIVER_BIN=./chromedriver_linux
else
  echo "There is no chromedriver binary for $OS."
  exit 1
fi

killSeleniumAndWebserver() {
  if [ -n "$SELENIUM_PID" ]; then
    echo "Killing Selenium..."
    kill $SELENIUM_PID
  fi

  if [ -n "$WEBSERVER_PID" ]; then
    echo "Killing the web server..."
    kill $WEBSERVER_PID
  fi
}

trap "killSeleniumAndWebserver" INT TERM EXIT

# Start Selenium.
java -jar ./selenium-server-standalone-2.41.0.jar -Dwebdriver.chrome.driver=$CHROMEDRIVER_BIN > selenium.log &
SELENIUM_PID=$!


# Start the webserver
gulp serve > connect-webserver.log &
WEBSERVER_PID=$!


# Lame, wait for Selenium and the webserver to start.
sleep 10


# Run Protractor.
./node_modules/.bin/protractor examples/protractor.conf.js

#!/bin/bash

# read app name
APP_NAME=$(grep -m1 '"name":' 5-SOURCE/package.json | awk -F'"' '{print $4}')
if [ -z "$APP_NAME" ]; then
  APP_NAME="anxioty-relase"
fi

echo "Boss, me deleting: $APP_NAME"

# remove from vercel
vercel rm "$APP_NAME" --yes

# remove from github
gh repo delete "$APP_NAME" --yes

# remove local git
rm -rf .git

echo "Done. Repo and Vercel website gone. Clean."

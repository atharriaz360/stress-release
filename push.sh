#!/bin/bash

# read app name from package.json
APP_NAME=$(grep -m1 '"name":' 5-SOURCE/package.json | awk -F'"' '{print $4}')
if [ -z "$APP_NAME" ]; then
  APP_NAME="new-app"
fi

echo "Boss, me make repo for: $APP_NAME"

# init git if no git
if [ ! -d ".git" ]; then
  git init
  git add .
  git commit -m "first rock"
fi

# add new files
git add .
git commit -m "update rock"

# make new github repo and push
gh repo create "$APP_NAME" --public --source=. --remote=origin --push

echo "Done. Repo live."

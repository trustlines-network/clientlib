#!/bin/sh

PWD="$(pwd)"
DIR="$(dirname "$(readlink -f "$0")")"

cd $DIR/../tests/testrelay
docker-compose up -d
sleep 30
npm run test:e2e
docker-compose down
cd "$PWD"

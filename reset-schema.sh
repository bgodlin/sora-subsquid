set -e
rm -rf generated/
yarn run codegen
./reset-db.sh
yarn run processor:start
set -e
rm -rf db/migrations/
npm run db:reset
npm run db:create-migration -n "sora"
npm run db:migrate
yarn run processor:start
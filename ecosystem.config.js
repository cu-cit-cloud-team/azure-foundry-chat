module.exports = {
  apps: [
    {
      name: 'azure-foundry-chat',
      script: './node_modules/next/dist/bin/next',
      args: `start -p ${process.env.PORT || 3000}`,
      watch: false,
      autorestart: true,
    },
  ],
};

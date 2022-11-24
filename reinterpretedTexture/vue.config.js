const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    host:'localhost',
    port:'8080',
    https:false,
    proxy: {
      '/ais': {
        target: 'https://www.vesselfinder.com/api/pub/',
        ws: true,
        timeout: 3600000,
        changeOrigin: true,
        pathRewrite: {
          '^/ais':''
        }
      }
    }
  }
})

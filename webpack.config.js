const path = require('path');

module.exports = {
  entry: './src/index.js', // 入口文件
  output: {
    filename: 'bundle.js', // 输出文件名
    path: path.resolve(__dirname, 'dist'), // 输出路径
    publicPath: '/' // 公共路径
  },
  mode: 'development', // 开发模式
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'dist'), // 静态文件目录
    },
    port: 8080, // 端口
    open: true, // 自动打开浏览器
    hot: true, // 启用热更新
    devMiddleware: {
      index: 'index.html', // 指定入口HTML文件
    },
    client: {
      overlay: true, // 在浏览器中显示编译错误或警告
    },
  },
};

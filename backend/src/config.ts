import dotenv from 'dotenv';
dotenv.config();

function req(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const config = {
  env: req('NODE_ENV', 'development'),
  port: parseInt(req('PORT', '4000'), 10),
  frontendUrl: req('FRONTEND_URL', 'http://localhost:4200'),
  jwtSecret: req('JWT_SECRET', 'dev-jwt-secret-change-me'),
  jwtRefreshSecret: req('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  masterKey: req('MASTER_KEY', 'dev-master-key-32-bytes-minimum!!'),
  mongoUri: req('MONGODB_URI', 'mongodb://127.0.0.1:27017/voxpilot'),
  s3: {
    endpoint: req('S3_ENDPOINT', ''),
    region: req('S3_REGION', 'us-east-1'),
    bucket: req('S3_BUCKET', 'voxpilot-recordings'),
    accessKey: req('S3_ACCESS_KEY', ''),
    secretKey: req('S3_SECRET_KEY', ''),
  },
  dataDir: req('DATA_DIR', './data'),
  jwtAccessTtl: '15m',
  jwtRefreshTtlDays: 7,
  // Global AI kill-switch default
  aiEnabledDefault: true,
};

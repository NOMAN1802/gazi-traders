/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import config from './app/config';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import routes from './app/routes';
import notFound from './app/middlewares/notFound';

const app: Application = express();



// Parse CLIENT_URL from environment variables (supports comma-separated values)
const allowedOrigins = config.client_url
  ? config.client_url.split(',').map((url: string) => url.trim())
  : [
      'hhttps://gagetraders.com',
      'hhttps://gagetraders.com',
      'http://localhost:5173',
    ];

// CORS must be first so all responses (including errors) include the headers
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

//parser
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/v1', routes);

//Testing
app.get('/', (req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: '🚀Welcome to  Server',
  });
});



//global error handler
app.use(globalErrorHandler);


// Not found 

app.use(notFound)


export default app;


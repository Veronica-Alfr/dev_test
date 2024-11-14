import 'reflect-metadata';
import express,  { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { User } from './entity/User';
import { Post } from './entity/Post';
import errorMiddleware from './middlewares/errors/errors';
import { validatePost, validateUser } from './middlewares/validations/schemas';

const app = express();
app.use(express.json());

const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DB_HOST || "localhost",
  port: 3306,
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "test_db",
  entities: [User,Post],
  synchronize: true,
});

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const initializeDatabase = async () => {
  await wait(20000);
  try {
    await AppDataSource.initialize();
    console.log("Data Source has been initialized!");
  } catch (err) {
    console.error("Error during Data Source initialization:", err);
    process.exit(1);
  }
};

initializeDatabase();

app.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedUser = validateUser(req.body);

    const userRepository = AppDataSource.getRepository(User);

    const user = userRepository.create(validatedUser);

    await userRepository.save(user);

    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

app.post('/posts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedPost = validatePost(req.body);

    const postRepository = AppDataSource.getRepository(Post);
    const userRepository = AppDataSource.getRepository(User);
    
    const user = await userRepository.findOneBy({ id: validatedPost.userId });

    if (!user) {
      const error = new Error('User not found');
      error.name = 'NotFound';
      return next(error);
    }

    const post = postRepository.create({
      ...validatedPost,
      userId: user.id,
    });

    await postRepository.save(post);

    return res.status(201).json(post);
  } catch (error) {
    next(error);
  }
});

app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

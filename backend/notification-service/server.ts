import app from './app';
const PORT = process.env.PORT || 3006;
app.listen(PORT, () => console.log(`Notification service on port ${PORT}`));
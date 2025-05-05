import app from './app';
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Audit service running on port ${PORT}`));
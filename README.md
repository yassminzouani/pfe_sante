# PFE Santé 

## Technologies utilisées

- React.js
- Node.js
- Express.js
- PostgreSQL / PostGIS
- Leaflet

# Installation du projet

## 1. Cloner le projet

git clone https://github.com/yassminzouani/pfe_sante.git
cd pfe_sante

## 2. Backend

cd backend
npm install

Créer un fichier `.env` :

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pfe_sante
DB_USER=postgres
DB_PASSWORD=motdepasse
PORT=5000

Lancer le backend :
npm start

## 3. Frontend

cd ../frontend-react
npm install
npm run dev

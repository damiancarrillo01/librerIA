const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class FirebaseConfig {
    constructor() {
        this.db = null;
        this.auth = null;
        this.storage = null;
        this._initializeFirebase();
    }

    _initializeFirebase() {
        try {
            // Verificar si ya está inicializado
            if (admin.apps.length === 0) {
                // Usar exclusivamente variables de entorno para credenciales
                const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
                const firebaseConfig = {
                    credential: admin.credential.cert({
                        type: "service_account",
                        project_id: process.env.FIREBASE_PROJECT_ID,
                        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                        private_key: privateKey,
                        client_email: process.env.FIREBASE_CLIENT_EMAIL,
                        client_id: process.env.FIREBASE_CLIENT_ID,
                        auth_uri: "https://accounts.google.com/o/oauth2/auth",
                        token_uri: "https://oauth2.googleapis.com/token",
                        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
                    })
                };
                // Agregar storageBucket solo si está configurado
                const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
                if (storageBucket) {
                    firebaseConfig.storageBucket = storageBucket;
                }
                admin.initializeApp(firebaseConfig);
                console.log('✅ Usando solo variables de entorno de Firebase');
                console.log('✅ Firebase inicializado correctamente');
            }

            // Inicializar servicios
            this.db = admin.firestore();
            this.auth = admin.auth();
            
            // Inicializar storage solo si está configurado
            try {
                this.storage = admin.storage().bucket();
                console.log('✅ Firebase Storage inicializado');
            } catch (storageError) {
                console.log('⚠️ Firebase Storage no configurado - continuando sin storage');
                this.storage = null;
            }
            
        } catch (error) {
            console.error('❌ Error inicializando Firebase:', error);
            console.log('💡 Asegúrate de que el archivo JSON de credenciales esté en la raíz del proyecto');
        }
    }

    // Métodos para Firestore
    async addDocument(collectionName, data, docId = null) {
        if (!this.db) {
            console.log('❌ Firebase no está inicializado');
            return false;
        }
        try {
            if (docId) {
                await this.db.collection(collectionName).doc(docId).set(data);
                console.log(`✅ Firestore: Documento '${docId}' en colección '${collectionName}' agregado/actualizado.`);
                return { id: docId };
            } else {
                const docRef = await this.db.collection(collectionName).add(data);
                console.log(`✅ Firestore: Documento '${docRef.id}' en colección '${collectionName}' agregado.`);
                return { id: docRef.id };
            }
        } catch (error) {
            console.error('❌ Error agregando documento a Firestore:', error);
            return false;
        }
    }

    async getDocument(collectionName, docId) {
        if (!this.db) {
            console.log('❌ Firebase no está inicializado');
            return null;
        }
        try {
            const doc = await this.db.collection(collectionName).doc(docId).get();
            if (doc.exists) {
                console.log(`✅ Firestore: Documento '${docId}' en colección '${collectionName}' obtenido.`);
                return { id: doc.id, ...doc.data() };
            } else {
                console.log(`ℹ️ Firestore: Documento '${docId}' no encontrado en colección '${collectionName}'.`);
                return null;
            }
        } catch (error) {
            console.error('❌ Error obteniendo documento de Firestore:', error);
            return null;
        }
    }

    async updateDocument(collectionName, docId, data) {
        if (!this.db) {
            console.log('❌ Firebase no está inicializado');
            return false;
        }
        try {
            await this.db.collection(collectionName).doc(docId).update(data);
            console.log(`✅ Firestore: Documento '${docId}' en colección '${collectionName}' actualizado.`);
            return true;
        } catch (error) {
            console.error('❌ Error actualizando documento en Firestore:', error);
            return false;
        }
    }

    async deleteDocument(collectionName, docId) {
        if (!this.db) {
            console.log('❌ Firebase no está inicializado');
            return false;
        }
        try {
            await this.db.collection(collectionName).doc(docId).delete();
            console.log(`✅ Firestore: Documento '${docId}' en colección '${collectionName}' eliminado.`);
            return true;
        } catch (error) {
            console.error('❌ Error eliminando documento de Firestore:', error);
            return false;
        }
    }

    // Métodos para sincronización con MongoDB
    async syncToFirebase(mongoModel, firebaseCollection, docId = null) {
        try {
            const data = mongoModel.toObject();
            delete data._id; // Remover _id de MongoDB
            delete data.__v; // Remover __v de MongoDB
            
            const firebaseId = docId || mongoModel._id.toString();
            return await this.addDocument(firebaseCollection, data, firebaseId);
        } catch (error) {
            console.error('❌ Error sincronizando a Firebase:', error);
            return false;
        }
    }

    // Método para generar ID único
    generateId() {
        return uuidv4();
    }
}

// Instancia global
const firebase = new FirebaseConfig();

module.exports = firebase; 
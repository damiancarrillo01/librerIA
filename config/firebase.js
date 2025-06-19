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
            // Verificar variables de entorno
            console.log('🔍 Verificando variables de entorno...');
            const requiredEnvVars = [
                'FIREBASE_PROJECT_ID',
                'FIREBASE_PRIVATE_KEY_ID',
                'FIREBASE_PRIVATE_KEY',
                'FIREBASE_CLIENT_EMAIL',
                'FIREBASE_CLIENT_ID',
                'FIREBASE_CLIENT_CERT_URL'
            ];

            const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
            if (missingVars.length > 0) {
                throw new Error(`Faltan variables de entorno requeridas: ${missingVars.join(', ')}`);
            }

            // Verificar si ya está inicializado
            if (admin.apps.length === 0) {
                console.log('🚀 Inicializando Firebase Admin SDK...');
                
                // Procesar la clave privada
                let privateKey = process.env.FIREBASE_PRIVATE_KEY;
                if (!privateKey) {
                    throw new Error('FIREBASE_PRIVATE_KEY no está definida');
                }

                // Limpiar la clave privada
                privateKey = privateKey
                    .replace(/\\n/g, '\n')
                    .replace(/^"|"$/g, '') // Remover comillas al inicio y final
                    .trim();

                console.log('📝 Verificando formato de la clave privada...');
                if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
                    throw new Error('Formato de clave privada inválido');
                }

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

                console.log('📝 Configuración de Firebase:', {
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    hasPrivateKey: !!privateKey,
                    privateKeyLength: privateKey.length
                });

                try {
                    admin.initializeApp(firebaseConfig);
                    console.log('✅ Firebase Admin SDK inicializado correctamente');
                } catch (initError) {
                    console.error('❌ Error al inicializar Firebase Admin SDK:', initError);
                    throw initError;
                }
            } else {
                console.log('ℹ️ Firebase Admin SDK ya está inicializado');
            }

            // Inicializar servicios
            try {
                this.db = admin.firestore();
                this.auth = admin.auth();
                console.log('✅ Firestore y Auth inicializados');
            } catch (serviceError) {
                console.error('❌ Error al inicializar servicios de Firebase:', serviceError);
                throw serviceError;
            }
            
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
            console.error('Stack trace:', error.stack);
            throw error;
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
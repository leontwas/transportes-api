# Frontend: Manejo de Errores en React Native

## 🐛 Problema Actual

Estás recibiendo el error:
```
Value for message cannot be cast from ReadableNativeArray to String
```

**Causa:** El backend con NestJS + class-validator devuelve errores de validación como **arrays de strings**, pero el frontend intenta mostrarlos como un string único en `Alert.alert()`.

---

## 🎯 Solución Completa

### 1. Actualizar LoginScreen.tsx

Reemplaza todo el contenido de `LoginScreen.tsx` con:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Validación básica en el frontend
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/api/v1/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      const { access_token, usuario } = response.data;

      if (!access_token) {
        Alert.alert('Error', 'No se recibió el token del servidor');
        return;
      }

      // Guardar token y datos del usuario
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(usuario));

      console.log('Login exitoso:', usuario);

      // Navegar según el rol
      if (usuario.rol === 'admin') {
        navigation.replace('AdminHome');
      } else if (usuario.rol === 'chofer') {
        navigation.replace('ChoferHome');
      } else {
        Alert.alert('Error', 'Rol de usuario no reconocido');
      }
    } catch (error: any) {
      console.error('Error de login:', error);
      handleLoginError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginError = (error: any) => {
    if (error.response) {
      // El servidor respondió con un código de error
      const { status, data } = error.response;

      // Extraer el mensaje de error (puede ser string o array)
      const errorMessage = data?.message;
      const displayMessage = Array.isArray(errorMessage)
        ? errorMessage.join('\n')
        : errorMessage || 'Error al iniciar sesión';

      // Mensajes específicos según el código de estado
      switch (status) {
        case 400:
          Alert.alert('Datos Inválidos', displayMessage);
          break;
        case 401:
          Alert.alert('Credenciales Incorrectas', displayMessage);
          break;
        case 403:
          Alert.alert('Acceso Denegado', displayMessage);
          break;
        case 500:
          Alert.alert('Error del Servidor', 'Ocurrió un error en el servidor. Intenta más tarde.');
          break;
        default:
          Alert.alert('Error', displayMessage);
      }
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta
      Alert.alert(
        'Error de Conexión',
        'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
      );
    } else {
      // Error al configurar la petición
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>Sistema de Transporte</Text>
        <Text style={styles.subtitle}>Iniciar Sesión</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('ForgotPassword')}
          disabled={loading}
        >
          <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Register')}
          disabled={loading}
        >
          <Text style={styles.linkText}>¿No tienes cuenta? Regístrate</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
});

export default LoginScreen;
```

---

### 2. Actualizar apiClient.ts (Interceptor Global)

Si no tienes un archivo `apiClient.ts`, créalo en `src/api/apiClient.ts`:

```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// IMPORTANTE: Cambia esta URL por la IP de tu servidor
// Puedes obtenerla ejecutando el backend y viendo la consola
const API_BASE_URL = 'http://192.168.0.23:3000'; // ⚠️ CAMBIAR POR TU IP

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de peticiones: Agregar token automáticamente
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error al obtener token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuestas: Manejo global de errores
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // Extraer mensaje de error (puede ser string o array)
      const errorMessage = data?.message;
      const displayMessage = Array.isArray(errorMessage)
        ? errorMessage.join('\n')
        : errorMessage || 'Ocurrió un error';

      // Manejo específico por código de estado
      switch (status) {
        case 401:
          // Token inválido o expirado
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          // No mostramos alert aquí, lo maneja cada pantalla
          break;

        case 403:
          // Acceso denegado
          console.error('Acceso denegado:', displayMessage);
          break;

        case 404:
          // Recurso no encontrado
          console.error('Recurso no encontrado:', displayMessage);
          break;

        case 500:
          // Error del servidor
          console.error('Error del servidor:', displayMessage);
          break;

        default:
          console.error('Error:', displayMessage);
      }
    } else if (error.request) {
      // Error de conexión
      console.error('Error de conexión:', error.message);
    } else {
      // Otro tipo de error
      console.error('Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### 3. Crear RegisterScreen.tsx (Pantalla de Registro)

Crea un nuevo archivo `src/screens/RegisterScreen.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import apiClient from '../api/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RegisterScreen = ({ navigation }: any) => {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    // Validaciones básicas
    if (!nombreCompleto.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (nombreCompleto.trim().length < 3) {
      Alert.alert('Error', 'El nombre debe tener al menos 3 caracteres');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/api/v1/auth/register', {
        nombre_completo: nombreCompleto.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      const { access_token, usuario } = response.data;

      if (!access_token) {
        Alert.alert('Error', 'No se recibió el token del servidor');
        return;
      }

      // Guardar token y datos del usuario
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(usuario));

      Alert.alert(
        'Registro Exitoso',
        'Tu cuenta ha sido creada exitosamente. Tu estado inicial es "Inactivo" y está pendiente de asignación por parte del administrador.',
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('ChoferHome'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error de registro:', error);
      handleRegisterError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterError = (error: any) => {
    if (error.response) {
      const { status, data } = error.response;

      const errorMessage = data?.message;
      const displayMessage = Array.isArray(errorMessage)
        ? errorMessage.join('\n')
        : errorMessage || 'Error al registrarse';

      switch (status) {
        case 400:
          Alert.alert('Datos Inválidos', displayMessage);
          break;
        case 409:
          Alert.alert('Email Ya Registrado', 'Este email ya está en uso. Intenta con otro.');
          break;
        case 500:
          Alert.alert('Error del Servidor', 'Ocurrió un error. Intenta más tarde.');
          break;
        default:
          Alert.alert('Error', displayMessage);
      }
    } else if (error.request) {
      Alert.alert(
        'Error de Conexión',
        'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
      );
    } else {
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Registro de Chofer</Text>
          <Text style={styles.subtitle}>Crea tu cuenta</Text>

          <TextInput
            style={styles.input}
            placeholder="Nombre Completo"
            placeholderTextColor="#999"
            value={nombreCompleto}
            onChangeText={setNombreCompleto}
            autoCapitalize="words"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña (mínimo 6 caracteres)"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirmar Contraseña"
            placeholderTextColor="#999"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Registrarse</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
});

export default RegisterScreen;
```

---

### 4. Crear ForgotPasswordScreen.tsx (Recuperación de Contraseña)

Crea `src/screens/ForgotPasswordScreen.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import apiClient from '../api/apiClient';

const ForgotPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/api/v1/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });

      Alert.alert(
        'Email Enviado',
        response.data.mensaje || 'Se ha enviado un correo con tu nueva contraseña temporal.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error forgot password:', error);
      handleForgotPasswordError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordError = (error: any) => {
    if (error.response) {
      const { status, data } = error.response;

      const errorMessage = data?.message;
      const displayMessage = Array.isArray(errorMessage)
        ? errorMessage.join('\n')
        : errorMessage || 'Error al recuperar contraseña';

      switch (status) {
        case 400:
          Alert.alert('Email Inválido', displayMessage);
          break;
        case 401:
          Alert.alert('Email No Encontrado', 'No existe una cuenta con este email.');
          break;
        case 500:
          Alert.alert(
            'Error al Enviar Email',
            'No se pudo enviar el email. Verifica la configuración del servidor.'
          );
          break;
        default:
          Alert.alert('Error', displayMessage);
      }
    } else if (error.request) {
      Alert.alert(
        'Error de Conexión',
        'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
      );
    } else {
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>Recuperar Contraseña</Text>
        <Text style={styles.subtitle}>
          Ingresa tu email y te enviaremos una contraseña temporal
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleForgotPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Enviar Email</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.linkText}>Volver al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
});

export default ForgotPasswordScreen;
```

---

### 5. Actualizar Navigation (App.tsx o AppNavigator.tsx)

Agrega las rutas de Register y ForgotPassword a tu navegador:

```typescript
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
// ... otros imports

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'Registro' }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ title: 'Recuperar Contraseña' }}
        />
        {/* ... otras pantallas */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
```

---

## 📝 Resumen de Cambios

### ✅ Cambios Principales

1. **Manejo de errores mejorado:**
   - Soporte para mensajes como string o array
   - Función `Array.isArray()` para detectar arrays
   - `.join('\n')` para convertir arrays a texto legible

2. **Validación en frontend:**
   - Validaciones antes de enviar al backend
   - Mejora la UX y reduce llamadas innecesarias

3. **Estados de carga:**
   - `ActivityIndicator` mientras se procesa
   - Deshabilitar botones durante peticiones

4. **Interceptor global:**
   - Manejo centralizado de errores
   - Token automático en todas las peticiones
   - Logout automático en 401

---

## 🧪 Testing

### Credenciales de Prueba

**Admin:**
```
Email: admin@transporte.com
Password: admin123
```

**Chofer:**
```
Email: carlos.andrada@transporte.com
Password: chofer123
```

### Casos a Probar

1. ✅ Login con credenciales correctas
2. ✅ Login con credenciales incorrectas
3. ✅ Login con email inválido (sin @)
4. ✅ Login con campos vacíos
5. ✅ Registro de nuevo usuario
6. ✅ Registro con email duplicado
7. ✅ Registro con contraseña corta (< 6 chars)
8. ✅ Registro con nombre corto (< 3 chars)
9. ✅ Forgot password con email existente
10. ✅ Forgot password con email inexistente

---

## ⚠️ Puntos Importantes

### 1. Cambiar URL del Backend

En `apiClient.ts`, actualiza:
```typescript
const API_BASE_URL = 'http://TU_IP_AQUI:3000'; // ⚠️ CAMBIAR
```

Para obtener tu IP, ejecuta el backend y verás:
```
📡 El servidor está escuchando en:
   • Red local:  http://192.168.0.23:3000  ← USA ESTA IP
```

### 2. Permisos en Android

Si usas la app en Android, necesitas permisos de internet. En `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

### 3. iOS y HTTP (no HTTPS)

Si usas iOS, necesitas permitir HTTP. En `ios/YourApp/Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

---

## 🐛 Troubleshooting

### Error: "Network request failed"
- Verifica que el backend esté corriendo
- Usa la IP correcta (no localhost desde móvil)
- Verifica que estés en la misma red WiFi

### Error: "Cannot read property 'message' of undefined"
- Verifica que el backend esté devolviendo el formato correcto
- Revisa los logs del backend con `npm run start:dev`

### Emails no se envían
- Configura variables de email en `.env` del backend
- Revisa la documentación en `BACKEND-AUTH-REGISTER-FORGOT-PASSWORD.md`

---

## 📚 Documentación del Backend

Para más información sobre los endpoints del backend, revisa:
- `BACKEND-ERROR-HANDLING.md` - Sistema de errores HTTP
- `BACKEND-AUTH-REGISTER-FORGOT-PASSWORD.md` - Endpoints de autenticación

---

🎉 **¡Listo!** Con estos cambios, el error debería estar resuelto y tendrás un manejo de errores robusto en toda la aplicación.

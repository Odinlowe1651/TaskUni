import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Configurar notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  // Estados principales
  const [materias, setMaterias] = useState([]);
  const [tareas, setTareas] = useState([]);
  const [vistaActual, setVistaActual] = useState('hoy');
  
  // Estados para modales
  const [modalMateria, setModalMateria] = useState(false);
  const [modalTarea, setModalTarea] = useState(false);
  
  // Estados para formularios
  const [nuevaMateria, setNuevaMateria] = useState({
    nombre: '',
    profesor: '',
    salon: '',
    dias: [],
    horaInicio: '',
    horaFin: ''
  });
  
  const [nuevaTarea, setNuevaTarea] = useState({
    materia: '',
    descripcion: '',
    fechaEntrega: '',
    completada: false
  });

  const diasSemana = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

  // Cargar datos al iniciar
  useEffect(() => {
    cargarDatos();
    solicitarPermisoNotificaciones();
    programarNotificacionesDiarias();
  }, []);

  // Solicitar permisos de notificaciones
  const solicitarPermisoNotificaciones = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Activa las notificaciones para recibir recordatorios de tus clases.');
      }
    } catch (error) {
      console.log('Error solicitando permisos:', error);
    }
  };

  // Cargar datos de AsyncStorage
  const cargarDatos = async () => {
    try {
      const materiasGuardadas = await AsyncStorage.getItem('materias');
      const tareasGuardadas = await AsyncStorage.getItem('tareas');
      
      if (materiasGuardadas) setMaterias(JSON.parse(materiasGuardadas));
      if (tareasGuardadas) setTareas(JSON.parse(tareasGuardadas));
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  // Guardar materias
  const guardarMaterias = async (nuevasMaterias) => {
    try {
      await AsyncStorage.setItem('materias', JSON.stringify(nuevasMaterias));
      setMaterias(nuevasMaterias);
    } catch (error) {
      console.error('Error guardando materias:', error);
    }
  };

  // Guardar tareas
  const guardarTareas = async (nuevasTareas) => {
    try {
      await AsyncStorage.setItem('tareas', JSON.stringify(nuevasTareas));
      setTareas(nuevasTareas);
    } catch (error) {
      console.error('Error guardando tareas:', error);
    }
  };

  // Programar notificación simple para clase
  const programarNotificacionClase = async (materia) => {
    try {
      // Programar notificación 15 minutos antes de cada clase
      for (const dia of materia.dias) {
        const diaIndex = diasSemana.indexOf(dia);
        if (diaIndex !== -1) {
          const [hora, minuto] = materia.horaInicio.split(':').map(Number);
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🎓 Clase en 15 minutos',
              body: `${materia.nombre} - Salon ${materia.salon}`,
              sound: true,
            },
            trigger: {
              weekday: diaIndex + 2, // Lunes = 2 en iOS
              hour: hora,
              minute: Math.max(0, minuto - 15),
              repeats: true,
            },
          });
        }
      }
    } catch (error) {
      console.log('Error programando notificación:', error);
    }
  };

  // Programar notificación diaria (9 AM)
  const programarNotificacionesDiarias = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📚 Revisa tus tareas',
          body: 'Buenos días! Verifica si tienes tareas pendientes para hoy',
          sound: true,
        },
        trigger: {
          hour: 9,
          minute: 0,
          repeats: true,
        },
      });
    } catch (error) {
      console.log('Error programando notificación diaria:', error);
    }
  };

  // Programar notificación de tarea (día anterior)
  const programarNotificacionTarea = async (tarea) => {
    try {
      const fechaEntrega = new Date(tarea.fechaEntrega);
      const fechaNotificacion = new Date(fechaEntrega);
      fechaNotificacion.setDate(fechaEntrega.getDate() - 1);
      fechaNotificacion.setHours(20, 0, 0, 0); // 8 PM del día anterior
      
      if (fechaNotificacion > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ Tarea pendiente',
            body: `Mañana entrega: ${tarea.descripcion} - ${tarea.materia}`,
            sound: true,
          },
          trigger: fechaNotificacion,
        });
      }
    } catch (error) {
      console.log('Error programando notificación de tarea:', error);
    }
  };

  // Agregar materia
  const agregarMateria = () => {
    if (!nuevaMateria.nombre || !nuevaMateria.salon || nuevaMateria.dias.length === 0) {
      Alert.alert('Error', 'Completa todos los campos obligatorios');
      return;
    }

    const materia = {
      id: Date.now().toString(),
      ...nuevaMateria
    };

    const materiasActualizadas = [...materias, materia];
    guardarMaterias(materiasActualizadas);
    programarNotificacionClase(materia);
    
    setNuevaMateria({
      nombre: '',
      profesor: '',
      salon: '',
      dias: [],
      horaInicio: '',
      horaFin: ''
    });
    setModalMateria(false);
    Alert.alert('Éxito', 'Materia agregada. Recibirás notificaciones 15 min antes de cada clase.');
  };

  // Agregar tarea
  const agregarTarea = () => {
    if (!nuevaTarea.materia || !nuevaTarea.descripcion || !nuevaTarea.fechaEntrega) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    const tarea = {
      id: Date.now().toString(),
      ...nuevaTarea
    };

    const tareasActualizadas = [...tareas, tarea];
    guardarTareas(tareasActualizadas);
    programarNotificacionTarea(tarea);
    
    setNuevaTarea({
      materia: '',
      descripcion: '',
      fechaEntrega: '',
      completada: false
    });
    setModalTarea(false);
    Alert.alert('Éxito', 'Tarea agregada. Recibirás recordatorio el día anterior.');
  };

  // Eliminar materia
  const eliminarMateria = (materiaId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Eliminar esta materia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const materiasActualizadas = materias.filter(m => m.id !== materiaId);
            guardarMaterias(materiasActualizadas);
          }
        }
      ]
    );
  };

  // Eliminar tarea
  const eliminarTarea = (tareaId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Eliminar esta tarea?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const tareasActualizadas = tareas.filter(t => t.id !== tareaId);
            guardarTareas(tareasActualizadas);
          }
        }
      ]
    );
  };

  // Obtener clases de hoy
  const obtenerClasesHoy = () => {
    const hoy = new Date();
    const diaHoy = diasSemana[hoy.getDay() - 1];
    
    if (!diaHoy) return [];
    
    return materias.filter(materia => materia.dias.includes(diaHoy))
                   .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  };

  // Obtener tareas de hoy
  const obtenerTareasHoy = () => {
    const hoy = new Date().toISOString().split('T')[0];
    return tareas.filter(tarea => tarea.fechaEntrega === hoy && !tarea.completada);
  };

  // Obtener próximas tareas
  const obtenerProximasTareas = () => {
    const hoy = new Date();
    const proxSemana = new Date();
    proxSemana.setDate(hoy.getDate() + 7);
    
    return tareas.filter(tarea => {
      if (tarea.completada) return false;
      const fechaTarea = new Date(tarea.fechaEntrega);
      return fechaTarea >= hoy && fechaTarea <= proxSemana;
    }).sort((a, b) => a.fechaEntrega.localeCompare(b.fechaEntrega));
  };

  // Marcar tarea como completada
  const completarTarea = (tareaId) => {
    const tareasActualizadas = tareas.map(tarea =>
      tarea.id === tareaId ? { ...tarea, completada: true } : tarea
    );
    guardarTareas(tareasActualizadas);
  };

  // Toggle día en selector
  const toggleDia = (dia) => {
    const diasActuales = nuevaMateria.dias;
    const nuevosDias = diasActuales.includes(dia)
      ? diasActuales.filter(d => d !== dia)
      : [...diasActuales, dia];
    
    setNuevaMateria({ ...nuevaMateria, dias: nuevosDias });
  };

  // Formatear fecha
  const formatearFecha = (fecha) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Render Vista Hoy
  const renderVistaHoy = () => {
    const clasesHoy = obtenerClasesHoy();
    const tareasHoy = obtenerTareasHoy();
    const proximasTareas = obtenerProximasTareas();

    return (
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Clases de Hoy</Text>
        {clasesHoy.length > 0 ? (
          clasesHoy.map(materia => (
            <View key={materia.id} style={styles.card}>
              <Text style={styles.cardTitle}>{materia.nombre}</Text>
              <Text style={styles.cardInfo}>
                {materia.horaInicio} - {materia.horaFin} | Salon {materia.salon}
              </Text>
              {materia.profesor && (
                <Text style={styles.cardSubInfo}>Prof: {materia.profesor}</Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.noData}>No tienes clases hoy</Text>
        )}

        <Text style={styles.sectionTitle}>Tareas de Hoy</Text>
        {tareasHoy.length > 0 ? (
          tareasHoy.map(tarea => (
            <View key={tarea.id} style={styles.card}>
              <Text style={styles.cardTitle}>{tarea.descripcion}</Text>
              <Text style={styles.cardInfo}>Materia: {tarea.materia}</Text>
              <TouchableOpacity
                style={styles.completarBtn}
                onPress={() => completarTarea(tarea.id)}
              >
                <Text style={styles.buttonText}>Marcar como completada</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.noData}>No tienes tareas para hoy</Text>
        )}

        {proximasTareas.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Próximas Tareas</Text>
            {proximasTareas.map(tarea => (
              <View key={tarea.id} style={styles.cardWarning}>
                <Text style={styles.cardTitle}>{tarea.descripcion}</Text>
                <Text style={styles.cardInfo}>Materia: {tarea.materia}</Text>
                <Text style={styles.cardWarningText}>
                  Entrega: {formatearFecha(tarea.fechaEntrega)}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    );
  };

  // Render Materias
  const renderMaterias = () => (
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>Mis Materias ({materias.length})</Text>
      {materias.map(materia => (
        <View key={materia.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{materia.nombre}</Text>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => eliminarMateria(materia.id)}
            >
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardInfo}>
            Salon: {materia.salon} | {materia.dias.join(', ')}
          </Text>
          <Text style={styles.cardSubInfo}>
            {materia.horaInicio} - {materia.horaFin}
          </Text>
          {materia.profesor && (
            <Text style={styles.cardSubInfo}>Prof: {materia.profesor}</Text>
          )}
        </View>
      ))}
      
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalMateria(true)}
      >
        <Text style={styles.addButtonText}>+ Agregar Materia</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Tareas
  const renderTareas = () => {
    const tareasActivas = tareas.filter(t => !t.completada);
    const tareasCompletadas = tareas.filter(t => t.completada);
    
    return (
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Tareas Pendientes ({tareasActivas.length})</Text>
        {tareasActivas.map(tarea => (
          <View key={tarea.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{tarea.descripcion}</Text>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => eliminarTarea(tarea.id)}
              >
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardInfo}>Materia: {tarea.materia}</Text>
            <Text style={styles.cardSubInfo}>
              Entrega: {formatearFecha(tarea.fechaEntrega)}
            </Text>
            <TouchableOpacity
              style={styles.completarBtn}
              onPress={() => completarTarea(tarea.id)}
            >
              <Text style={styles.buttonText}>Marcar como completada</Text>
            </TouchableOpacity>
          </View>
        ))}

        {tareasCompletadas.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Tareas Completadas ({tareasCompletadas.length})</Text>
            {tareasCompletadas.slice(0, 3).map(tarea => (
              <View key={tarea.id} style={styles.cardCompleted}>
                <Text style={styles.cardTitleCompleted}>{tarea.descripcion}</Text>
                <Text style={styles.cardInfo}>✓ Completada</Text>
              </View>
            ))}
          </>
        )}
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalTarea(true)}
        >
          <Text style={styles.addButtonText}>+ Agregar Tarea</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mis Clases</Text>
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[styles.navButton, vistaActual === 'hoy' && styles.navButtonActive]}
            onPress={() => setVistaActual('hoy')}
          >
            <Text style={styles.navText}>Hoy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, vistaActual === 'materias' && styles.navButtonActive]}
            onPress={() => setVistaActual('materias')}
          >
            <Text style={styles.navText}>Materias</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, vistaActual === 'tareas' && styles.navButtonActive]}
            onPress={() => setVistaActual('tareas')}
          >
            <Text style={styles.navText}>Tareas</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contenido */}
      <ScrollView style={styles.scrollView}>
        {vistaActual === 'hoy' && renderVistaHoy()}
        {vistaActual === 'materias' && renderMaterias()}
        {vistaActual === 'tareas' && renderTareas()}
      </ScrollView>

      {/* Modal Materia */}
      <Modal visible={modalMateria} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Materia</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nombre de la materia"
              value={nuevaMateria.nombre}
              onChangeText={(text) => setNuevaMateria({...nuevaMateria, nombre: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Profesor (opcional)"
              value={nuevaMateria.profesor}
              onChangeText={(text) => setNuevaMateria({...nuevaMateria, profesor: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Salon"
              value={nuevaMateria.salon}
              onChangeText={(text) => setNuevaMateria({...nuevaMateria, salon: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Hora inicio (08:00)"
              value={nuevaMateria.horaInicio}
              onChangeText={(text) => setNuevaMateria({...nuevaMateria, horaInicio: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Hora fin (09:30)"
              value={nuevaMateria.horaFin}
              onChangeText={(text) => setNuevaMateria({...nuevaMateria, horaFin: text})}
            />
            
            <Text style={styles.label}>Días de la semana:</Text>
            <View style={styles.diasContainer}>
              {diasSemana.map(dia => (
                <TouchableOpacity
                  key={dia}
                  style={[
                    styles.diaButton,
                    nuevaMateria.dias.includes(dia) && styles.diaButtonActive
                  ]}
                  onPress={() => toggleDia(dia)}
                >
                  <Text style={styles.diaText}>{dia.substring(0, 3)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalMateria(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={agregarMateria}
              >
                <Text style={styles.buttonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Tarea */}
      <Modal visible={modalTarea} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Tarea</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Materia"
              value={nuevaTarea.materia}
              onChangeText={(text) => setNuevaTarea({...nuevaTarea, materia: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Descripción de la tarea"
              value={nuevaTarea.descripcion}
              multiline
              numberOfLines={3}
              onChangeText={(text) => setNuevaTarea({...nuevaTarea, descripcion: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Fecha entrega (2024-12-25)"
              value={nuevaTarea.fechaEntrega}
              onChangeText={(text) => setNuevaTarea({...nuevaTarea, fechaEntrega: text})}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalTarea(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={agregarTarea}
              >
                <Text style={styles.buttonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  navButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  navButtonActive: {
    backgroundColor: '#007AFF',
  },
  navText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardWarning: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardCompleted: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    opacity: 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    flex: 1,
  },
  cardTitleCompleted: {
    fontSize: 16,
    color: '#666',
    textDecorationLine: 'line-through',
  },
  cardInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  cardSubInfo: {
    fontSize: 14,
    color: '#888',
  },
  cardWarningText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#FF3B30',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  completarBtn: {
    backgroundColor: '#34C759',
    padding: 10,
    borderRadius: 5,
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  noData: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 20,
    fontStyle: 'italic',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  addButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  diasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  diaButton: {
    padding: 8,
    margin: 4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  diaButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  diaText: {
    fontSize: 12,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#FF6B35',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
});
<?php
// Prepara un Moodle local (moodlehq/moodle-docker) para la prueba LTI 1.3 del asistente AERG:
// registra la herramienta externa (LTI 1.3 + AGS), crea un curso con un docente y un alumno
// y una actividad que usa la herramienta. Es idempotente: si algo ya existe, lo reutiliza.
//
// Uso (desde el host):
//   docker cp scripts/evidencias/moodle_preparar_lti.php moodle-docker-webserver-1:/tmp/
//   docker exec moodle-docker-webserver-1 php /tmp/moodle_preparar_lti.php <url_backend>
// Imprime un JSON con los LTI_* que deben ir en backend/.env.

define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->dirroot . '/mod/lti/locallib.php');
require_once($CFG->dirroot . '/course/modlib.php');
require_once($CFG->dirroot . '/user/lib.php');
require_once($CFG->dirroot . '/enrol/manual/lib.php');

$backend = rtrim($argv[1] ?? 'http://host.docker.internal:8000', '/');
\core\session\manager::set_user(get_admin());

// Moodle bloquea por defecto las peticiones salientes a IPs privadas; la herramienta corre
// en el host (host.docker.internal), por lo que se permite solo en este entorno local.
set_config('curlsecurityblockedhosts', '');
set_config('curlsecurityallowedport', '');

// ------------------------------------------------------------- herramienta externa
$toolname = 'Asistente AERG';
$type = $DB->get_record('lti_types', ['name' => $toolname]);
if (!$type) {
    $type = new stdClass();
    $type->state = LTI_TOOL_STATE_CONFIGURED;
    $type->coursevisible = LTI_COURSEVISIBLE_ACTIVITYCHOOSER;
    $type->ltiversion = LTI_VERSION_1P3;
    $type->clientid = null;
    $config = new stdClass();
    $config->lti_typename = $toolname;
    $config->lti_toolurl = $backend . '/api/lti/callback';
    $config->lti_ltiversion = LTI_VERSION_1P3;
    $config->lti_keytype = LTI_JWK_KEYSET;
    $config->lti_publickeyset = $backend . '/api/lti/jwks';
    $config->lti_initiatelogin = $backend . '/api/lti/launch';
    $config->lti_redirectionuris = $backend . '/api/lti/callback';
    $config->lti_coursevisible = LTI_COURSEVISIBLE_ACTIVITYCHOOSER;
    $config->lti_launchcontainer = LTI_LAUNCH_CONTAINER_WINDOW;
    // Nombre y correo del usuario en el id_token (RS-01) y AGS para la calificacion (RF-20).
    $config->lti_sendname = LTI_SETTING_ALWAYS;
    $config->lti_sendemailaddr = LTI_SETTING_ALWAYS;
    $config->lti_acceptgrades = LTI_SETTING_ALWAYS;
    $config->ltiservice_gradesynchronization = 2;
    $config->ltiservice_memberships = 0;
    $config->ltiservice_toolsettings = 0;
    $typeid = lti_add_type($type, $config);
    $type = $DB->get_record('lti_types', ['id' => $typeid]);
}

// ----------------------------------------------------------- curso y participantes
$course = $DB->get_record('course', ['shortname' => 'AERG-LTI']);
if (!$course) {
    $course = create_course((object) [
        'fullname' => 'Redaccion academica (prueba LTI AERG)',
        'shortname' => 'AERG-LTI',
        'category' => 1,
    ]);
}

function aerg_user(string $username, string $first, string $last): stdClass {
    global $DB, $CFG;
    $user = $DB->get_record('user', ['username' => $username]);
    if (!$user) {
        $id = user_create_user((object) [
            'username' => $username,
            'password' => 'Prueba.AERG.2026',
            'firstname' => $first,
            'lastname' => $last,
            'email' => $username . '@example.com',
            'auth' => 'manual',
            'confirmed' => 1,
            'mnethostid' => $CFG->mnet_localhost_id,
        ]);
        $user = $DB->get_record('user', ['id' => $id]);
    }
    return $user;
}

$teacher = aerg_user('docente1', 'Docente', 'Prueba');
$student = aerg_user('alumno1', 'Alumno', 'Prueba');

$enrol = enrol_get_plugin('manual');
$instance = $DB->get_record('enrol', ['courseid' => $course->id, 'enrol' => 'manual'], '*', MUST_EXIST);
$enrol->enrol_user($instance, $teacher->id, $DB->get_field('role', 'id', ['shortname' => 'editingteacher']));
$enrol->enrol_user($instance, $student->id, $DB->get_field('role', 'id', ['shortname' => 'student']));

// ------------------------------------------------------------------- actividad LTI
$lti = $DB->get_record('lti', ['course' => $course->id, 'typeid' => $type->id]);
if (!$lti) {
    $module = create_module((object) [
        'modulename' => 'lti',
        'course' => $course->id,
        'section' => 1,
        'visible' => 1,
        'name' => 'Ensayo argumentativo (evaluado con AERG)',
        'typeid' => $type->id,
        'toolurl' => '',
        'instructorchoiceacceptgrades' => LTI_SETTING_ALWAYS,
        'instructorchoicesendname' => LTI_SETTING_ALWAYS,
        'instructorchoicesendemailaddr' => LTI_SETTING_ALWAYS,
        'launchcontainer' => LTI_LAUNCH_CONTAINER_WINDOW,
        'grade' => 100,
        'introeditor' => ['text' => '', 'format' => FORMAT_HTML, 'itemid' => 0],
    ]);
    $lti = $DB->get_record('lti', ['id' => $module->instance]);
}
$cm = get_coursemodule_from_instance('lti', $lti->id, $course->id, false, MUST_EXIST);
$deployment = $DB->get_record('lti_types', ['id' => $type->id]);

echo json_encode([
    'moodle_release' => $CFG->release,
    'LTI_ISSUER' => $CFG->wwwroot,
    'LTI_CLIENT_ID' => $deployment->clientid,
    'LTI_DEPLOYMENT_ID' => (string) $type->id,
    'LTI_JWKS_URL' => $CFG->wwwroot . '/mod/lti/certs.php',
    'LTI_AUTH_LOGIN_URL' => $CFG->wwwroot . '/mod/lti/auth.php',
    'LTI_TOKEN_URL' => $CFG->wwwroot . '/mod/lti/token.php',
    'course_id' => (int) $course->id,
    'cmid' => (int) $cm->id,
    'lti_instance' => (int) $lti->id,
    'teacher_id' => (int) $teacher->id,
    'student_id' => (int) $student->id,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";

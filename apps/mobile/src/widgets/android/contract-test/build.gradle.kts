plugins {
    kotlin("jvm") version "2.0.21"
}

repositories {
    mavenCentral()
}

dependencies {
    compileOnly("com.google.android:android:4.1.1.4")
    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
    testImplementation("org.json:json:20240303")
}

tasks.test {
    useJUnitPlatform()
}

kotlin {
    jvmToolchain(17)
}

sourceSets {
    main {
        kotlin.srcDir("../kotlin")
        kotlin.include("WidgetDataHelper.kt")
    }
    test {
        kotlin.srcDir("src/test/kotlin")
    }
}

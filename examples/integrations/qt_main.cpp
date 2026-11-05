#include "cydoc_link.hpp"
#include <QApplication>
#include <QCoreApplication>
#include <QDesktopServices>
#include <QLabel>
#include <QShortcut>
#include <QUrl>
#include <QWidget>

int main(int argc, char** argv) {
    QApplication app(argc, argv);
    QWidget window;
    window.setWindowTitle("CyDoc · Qt F1"); window.resize(480, 180);
    window.setProperty("cydocPage", "precise-links");
    auto* label = new QLabel("F1: open local contextual help", &window); label->move(30, 50);
    auto* help = new QShortcut(QKeySequence(Qt::Key_F1), &window);
    QObject::connect(help, &QShortcut::activated, &window, [&window] {
        QWidget* context = QApplication::focusWidget();
        while (context && !context->property("cydocPage").isValid()) context = context->parentWidget();
        const auto page = (context ? context : &window)->property("cydocPage").toString();
        const auto file = QUrl::fromLocalFile(QCoreApplication::applicationDirPath() + "/help/index.html");
        QDesktopServices::openUrl(QUrl::fromEncoded(QByteArray::fromStdString(cydoc_native::link(file.toEncoded().toStdString(), "fr", page.toUtf8().toStdString()))));
    });
    window.show(); return app.exec();
}

﻿#define _CRT_SECURE_NO_WARNINGS
#include "stdlib.h"
#include "stdio.h"
#include "conio.h"
#include "math.h"
#include "locale.h"
#include "string.h"
#include "windows.h"

/* структура з даними службовцяя */
struct tPerson {
	char surname[30];
	char name[30];
};

/* структура вузла стека */
struct tStackNode { /* структура вузла стека */
	struct tPerson person; /* дані про службовця */
	tStackNode* next; /* покажчик на наступний елемент стека */
};

/* формат дескриптора стека */
struct tSD {
	tStackNode* top; /* покажчик вершини стека */
	int size; /* поточний розмір стека (в елементах) */
};

/* Прототипи функцій */
tSD* CreateStack(void);
int PushStack(tSD* sd, const tPerson* person);
int PopStack(tSD* sd, tPerson* person);
int DestroyStack(tSD* sd);
void Input(tPerson* person);
void Print(const tPerson* person);
int Enter(int& N);
void CheckFilename(char filename[]);
void FopenCheck(FILE*& fp, char filename[], char d);
int GetPerson(char line[], tPerson* person);

int main() {
	FILE* fr = NULL; //файловий дескриптор для встановлення потоку з файлом
	tPerson person; //змінна структурного типу для передачі даних в стек
	int workWithStack; //змінна пункту меню
	char filename[50]; //рядок з назвою файлу
	char string[50]; //масив для переписування рядків по одному з файлу
	bool flag = true; //змінна для повторного вводу пункту меню

	SetConsoleCP(1251); //підключення кирилиці
	SetConsoleOutputCP(1251);

	tSD* sd = CreateStack(); //створюємо стек

	if (sd == NULL) {
		printf("Cтек не створений!");
		return 1;
	}

	printf("Стек створено!\n");

	do {
		printf("1)Заповнити стек з існуючого файлу (прізвище ім'я вік);\n2)Створити новий файл;\n");
		Enter(workWithStack); //зчитування пункту меню

		switch (workWithStack) {
		case 1: {
			printf("Введіть назву файлу у вигляді name.txt, з якого бажаєте зчитати дані:\n");
			CheckFilename(filename); //перевірка правильності введення назви файла
			FopenCheck(fr, filename, 'r'); //вiдкриття файлу, та перевірка на помилки

			while (fgets(string, 50, fr)) {
				if (GetPerson(string, &person) == 1) { //заносимо дані з файлу до структури з перевіркою
					printf("Елементи повинні бути у вигляді <прізвище ім'я>!");
					return 2;
				}

				int check = PushStack(sd, &person); //розміщуємо в стеку

				if (check == -1) {
					printf("Не вистачає пам'яті (стек повний)!");
					return 1;
				}
			}

			fclose(fr);

			if (ferror(fr)) {
				printf("Помилка при закритті файлу %s", filename);
				return 1;
			}

			FopenCheck(fr, filename, 'a');
			break;
		}
		case 2: {
			printf("Введіть назву файлу у вигляді name.txt:\n");
			CheckFilename(filename); //перевірка правильності введення назви файла
			FopenCheck(fr, filename, 'w'); //вiдкриття файлу, та перевірка на помилки
			break;
		}
		default: {
			printf("Ви ввели некоректне значення, спробуйте ще раз!\n");
			flag = true;
			continue;
		}
		}
	} while (!flag);

	for (;;) {

		printf("\nВиберіть тип роботи зі стеком:\n1)Розмістити елемент в стеку;\n2)Зчитування елемента зі стека з видаленням;\n3)Отримати поточний розмір стека;\n4)Відобразити вміст стека на екрані;\n0)Завершити програму;\n");
		Enter(workWithStack); //зчитування пункту меню

		switch (workWithStack) {
		case 0: {
			fclose(fr);

			if (ferror(fr)) {
				printf("Помилка при закритті файлу %s", filename);
				return 1;
			}

			DestroyStack(sd); //видалення стека

			printf("\nСтек видалено!\n");

			printf("Робота програми завершена!\n");
			return 0;
		}
		case 1: {
			Input(&person); //введення даних в структуку
			int check = PushStack(sd, &person); //додання структури до стека з перевіркою

			if (check == -1) {
				printf("\nНе вистачає пам'яті (стек повний)!\n");
				break;
			}

			if (!fprintf(fr, "%s %s\n", person.surname, person.name)) //записуємо введену структуру у файл
			{
				printf("Виникла помилка запису структури у файл!\n");
				return 1;
			}

			break;
		}
		case 2: {
			int check = PopStack(sd, &person);

			if (check == -3) {
				printf("\nCтек вже порожній!\n");
				break;
			}

			tPerson* helpPerson = (tPerson*)calloc(sd->size, sizeof(tPerson)); //ініциалізуємо динамічний допоміжний масив
			int currentSize = sd->size;
			for (int i = sd->size - 1; i >= 0; i--) { //видалення та переносення даних в допоміжний масив
				PopStack(sd, &helpPerson[i]);
			}

			fclose(fr);

			if (ferror(fr)) {
				printf("Помилка при закритті файлу %s", filename);
				return 1;
			}

			FopenCheck(fr, filename, 'w'); //закриття і відкриття файлу для очищення

			for (int i = 0; i < currentSize; i++) { //перенесення даних в стек та файл
				PushStack(sd, &helpPerson[i]);
				if (!fprintf(fr, "%s %s\n", helpPerson[i].surname, helpPerson[i].name))
				{
					printf("Виникла помилка запису структури у файл!\n");
					return 1;
				}
			}

			free(helpPerson);
			Print(&person); //виводення видаленого масиву на консоль
			printf("Елемент видалено!\n\n");
			break;
		}
		case 3: {
			printf("\nПоточний розмір стеку (в елементах) - %d \n\n", sd->size);
			break;
		}
		case 4: {
			fclose(fr);

			if (ferror(fr)) {
				printf("Помилка при закритті файлу %s", filename);
				return 1;
			}

			FopenCheck(fr, filename, 'r');

			int i = 1;
			while (fgets(string, 50, fr)) { //виводимо файл на екран
				printf("[%d]: %s", i++, &string);
			}

			fclose(fr);

			if (ferror(fr)) {
				printf("Помилка при закритті файлу %s", filename);
				return 1;
			}

			FopenCheck(fr, filename, 'a');
			break;
		}
		default: {
			printf("Ви ввели некоректне значення, спробуйте ще раз!\n");
			continue;
		}
		}


	}
}

/*Функція створення стека
Вихід:
Адреса на створений стек
*/
tSD* CreateStack(void) {
	tSD* sd;
	sd = (tSD*)malloc(sizeof(tSD));

	if (!sd)
		return NULL;   /* стек не створений */

	else { /* стек створений */
		sd->top = NULL; /* ініціалізація вершини стека */
		sd->size = 0; /* ініціалізація розміру стека */
		return sd;
	}
}

/*Функція включення елемента до стека
Вхід:
Адреса на стек
Елемент, який буде доданий до стека
*/
int PushStack(tSD* sd, const tPerson* person) {
	tStackNode* sn; /* покажчик на новий елемент */
	if (!sd) /* стек не існує! */
		return -2;
	sn = (tStackNode*)malloc(sizeof(tStackNode)); /* створення нового вузла списку */
	if (!sn) /* не вистачає пам'яті (стек повний) */
		return -1;
	sn->person = *person; /* занесення даних про в стек */
	sn->next = sd->top; /* встановлення покажчика на наступний елемент у новому вузлі */

	sd->size++; /* зміна поточного розміру стека */
	sd->top = sn; /* встановлення покажчика на вершину стека в дескрипторі */

	return 0;
}

/*Функція вибірки елемента зі стека
Вхід:
Адреса на стек
Змінна, в яку запишеться видалений елемент
*/
int PopStack(tSD* sd, tPerson* worker) {
	tStackNode* pDel; /* адреса "виштовхуємого" вузла */

	if (!sd) /* стек не існує */
		return -2;

	if (!sd->top) /* стек вже порожній (underflow) */
		return -3;

	else { /* вибірка елемента з-верхівки стека */
		*worker = sd->top->person; /* передаються дані з елемента */
		pDel = sd->top; /* зберігається адреса "виштовхуємого" елемента */
		sd->top = sd->top->next; // вершиною стека стає наступний елемент
		sd->size--; /* зміна поточного розміру стека */
		free(pDel); /* звільняється пам'ять "виштовхнутого" елемента */

		return 0;
	}
}

/*Функція видалення стека
Вхід:
Адреса на стек, який буде видалений
*/
int DestroyStack(tSD* sd) {
	tStackNode* pDel; /* адреса тимчасового елемента стека */

	if (!sd) /* стек не існує */
		return -2;

	/* якщо стек не порожній - спершу слід видалити всі елементи! */
	while (sd->top) { /* обхід елементів стека */
		pDel = sd->top; /* збереження адреси вершини стека для видалення */
		sd->top = sd->top->next; /* "обрізання" верхівки стека */
		free(pDel); /* видалення колишньої верхівки стека*/
	}
	free(sd); /* звільняється пам'ять дескриптора стека */

	return 0;
}

/*Функція введеня значень до стека з перевіркою
Вхід:
Змінна структурного типу
*/
void Input(tPerson* person) {
	do {
		printf("Прізвище: ");
		gets_s(person->surname);

		if (person->surname[0] == '\n')
		{
			printf("Ви нічого не ввели, спробуйте ще раз!\n");
		}

		if (strlen(person->surname) > 20) {
			printf("Не вистачає пам'яті, спробуйте ще раз!\n");
		}

	} while (person->surname[0] == '\n' && strlen(person->surname) > 20);

	do {
		printf("Ім'я: ");
		gets_s(person->name);

		if (person->name[0] == '\n')
		{
			printf("Ви нічого не ввели, спробуйте ще раз!\n");
		}

		if (strlen(person->name) > 20) {
			printf("Не вистачає пам'яті, спробуйте ще раз!\n");
		}

	} while (person->name[0] == '\n' && strlen(person->name) > 20);
}

/*Функція виведення стека на екран
Вхід:
Змінна структурного типу
*/
void Print(const tPerson* person) {
	printf("Прізвище: %s\nІм'я: %s\n", person->surname, person->name);
}

/*Функція введення значень змінних
Вхід:
Змінна для заповнення, передача за посиланням
Вихід:
Змінна з записаним числом
*/
int Enter(int& N) {
	while (scanf_s("%d%*c", &N) < 1) {
		printf("Ви ввели некоректне значення, повторіть введення: ");
		getchar();
	}
	return N;
}

/*Функція для перевірки правильності введення назви файлів
Вхід:
Масив, у якому записана назва файлу, яку ввів користувач filename[]
*/
void CheckFilename(char filename[]) {
	int fcheck = 0; //змінна для контролю правильності вводу назви файлу користувачем
	int scheck = 0; //змінна для контролю правильності вводу назви файлу користувачем
	do {
		fgets(filename, 1024, stdin);
		fcheck = 1;
		scheck = 0;
		for (int i = 0; i < strlen(filename); i++)
		{
			if (filename[i] == '.' && i != 0)
			{
				scheck = 1;
				if (filename[i + 1] != 't' || filename[i + 2] != 'x' || filename[i + 3] != 't' || filename[i + 4] != '\n')
				{
					printf("Ви ввели розширення не вірно, спробуйте ще раз!\n");
					fcheck = 0;
				}
			}
		}
		if (filename[0] == '\n')
		{
			printf("Ви нічого не ввели, спробуйте ще раз!\n");
		}

		if (scheck == 0 && filename[0] != '\n')
		{
			printf("Ви не ввели розширення, спробуйте ще раз!\n");
		}
	} while (filename[0] == '\n' || fcheck == 0 || scheck == 0);
	filename[strlen(filename) - 1] = '\0'; //змінює \n на \0
}

/*Функція вiдкриття файлу, та перевірки на помилки
Вхід:
Файловий дескриптор fp
Масив, у якому записана назва файлу, яку ввів користувач filename[]
Змінна для визначення яким способом буде відкритий файл
*/
void FopenCheck(FILE*& fp, char filename[], char d) {
	if (d == 'r') {
		if ((fp = fopen(filename, "r")) == NULL)
		{
			printf("Виникла помилка при відкритті файлу %s! \n", filename);
			exit(0);
		}
	}
	if (d == 'w') {
		if ((fp = fopen(filename, "w")) == NULL)
		{
			printf("Виникла помилка при відкритті файлу %s! \n", filename);
			exit(0);
		}
	}
	if (d == 'a') {
		if ((fp = fopen(filename, "a")) == NULL)
		{
			printf("Виникла помилка при відкритті файлу %s! \n", filename);
			exit(0);
		}
	}
}

/*Функція занесення значень зі строки в структуру з перевіркою
Вхід:
Рядок, з якого будуть братися дані
Змінна структурного типу, в яку будуть занесені дані
*/
int GetPerson(char line[], tPerson* person) {
	int w = 0;
	int k = 0;

	for (int i = w;; i++) {
		if (line[i] >= 'A' && line[i] <= 'Z' || line[i] >= 'a' && line[i] <= 'z') {
			w = i;
			for (int j = i;; j++) {
				if (line[j] == ' ') {
					w++;
					break;
				}
				else {
					person->surname[k] = line[i];
					i++;
					k++;
					w++;
				}
			}
			break;
		}
		else
			return 1;
	}

	if (person->surname[k] != '\0') {
		person->surname[k] = '\0';
	}

	k = 0;

	for (int i = w;; i++) {
		if (line[i] >= 'A' && line[i] <= 'Z' || line[i] >= 'a' && line[i] <= 'z') {
			w = i;
			for (int j = i;; j++) {
				if (line[j] == ' ') {
					w++;
					break;
				}
				else {
					person->name[k] = line[i];
					i++;
					k++;
					w++;
				}
			}
			break;
		}
		else
			return 1;
	}

	if (person->name[k] != '\0') {
		person->name[k] = '\0';
	}

	return 0;
}
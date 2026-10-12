type Book = { title: string; authors: string[]; slug: string }

/** « D'après Livre A, Auteur, et Livre B, Auteur » : un cours peut être bâti sur plusieurs livres. */
export function CourseBooks({ course, withAuthors = true }: { course: { book: Book; books?: Book[] }; withAuthors?: boolean }) {
  const books: Book[] = [course.book, ...(course.books ?? [])]
  return (
    <>
      D'après{' '}
      {books.map((b, i) => (
        <span key={b.slug}>
          {i > 0 && (i === books.length - 1 ? ' et ' : ', ')}
          <em className="font-read">{b.title}</em>
          {withAuthors && b.authors.length > 0 && `, ${b.authors.join(' et ')}`}
        </span>
      ))}
    </>
  )
}
